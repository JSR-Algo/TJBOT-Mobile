#!/usr/bin/env ruby
# activate-voice-native.rb
#
# Idempotently adds the native voice-stack Swift/ObjC sources to the iOS
# Xcode target. Supersedes the VoiceSession/README.md "open Xcode UI"
# activation steps; user chose hand-edit per plan.
#
# Runs via the xcodeproj gem (bundled with CocoaPods) so every new file
# reference gets a deterministic 24-char hex UUID in the same shape Xcode
# itself generates. A raw text-diff of project.pbxproj would almost
# certainly corrupt cross-phase refs — don't do that.
#
# Usage:
#   cd TJBot-mobile && ruby scripts/activate-voice-native.rb
#   cd ios && pod install   # refresh autolinking
#
# Guarantees:
#   - Re-running is a no-op once all files are present.
#   - Only touches the TJBotMobile target (ignores Pods target).
#   - Sources added land in the target's "Compile Sources" build phase.
#   - Bridging header is a file reference only (never compiled).
#   - Build settings set on every configuration (Debug + Release).

require 'xcodeproj'

PROJECT_PATH = File.expand_path('../ios/TJBotMobile.xcodeproj', __dir__)
TARGET_NAME  = 'TJBotMobile'

# [relative_path_from_ios_TJBotMobile, compile?, group_path_from_project_root]
FILES = [
  # MB-NATIVE-VOICE-001 — VoiceSession (already on disk, just not in target)
  ['VoiceSession/VoiceSessionModule.swift', true,  'TJBotMobile/VoiceSession'],
  ['VoiceSession/VoiceSessionModule.m',     true,  'TJBotMobile/VoiceSession'],

  # Shared infra — SharedVoiceEngine actor (Phase 3; file may not exist yet
  # when this script first runs. Guard with File.exist? below.)
  ['SharedVoiceEngine.swift',               true,  'TJBotMobile'],

  # MB-NATIVE-VOICE-003 — VoiceMic (Phase 4)
  ['VoiceMic/VoiceMicModule.swift',         true,  'TJBotMobile/VoiceMic'],
  ['VoiceMic/VoiceMicModule.m',             true,  'TJBotMobile/VoiceMic'],

  # MB-NATIVE-VOICE-004 — PcmStream (Phase 5)
  ['PcmStream/PcmStreamModule.swift',       true,  'TJBotMobile/PcmStream'],
  ['PcmStream/PcmStreamModule.m',           true,  'TJBotMobile/PcmStream'],

  # Bridging header — project root, non-compiled, needed so Swift sees
  # React's ObjC headers.
  ['TJBotMobile-Bridging-Header.h',          false, 'TJBotMobile'],
].freeze

# Build settings applied to every configuration on the target.
BUILD_SETTINGS = {
  'SWIFT_OBJC_BRIDGING_HEADER' => 'TJBotMobile/TJBotMobile-Bridging-Header.h',
  'SWIFT_VERSION'              => '5.0',
  'CLANG_ENABLE_MODULES'       => 'YES',
}.freeze

def log(msg)
  puts "[activate-voice-native] #{msg}"
end

def find_or_create_group(project, path)
  # path is "TJBotMobile/VoiceSession" — walk/create subgroups off main_group.
  # Project convention (see TJBotMobile group at pbxproj line 72): virtual
  # groups with `name` only, NO `path` attribute. File references inside
  # carry the full project-root-relative path. Passing `path` to `new_group`
  # would make it a real-folder group and break path resolution.
  segments = path.split('/')
  group = project.main_group
  segments.each do |segment|
    child = group.groups.find { |g| g.name == segment || g.path == segment }
    if child.nil?
      child = group.new_group(segment) # virtual group — name only, no path
      log "  + created virtual group #{segment} under #{group.display_name}"
    end
    group = child
  end
  group
end

def file_already_referenced?(target, file_abs_path)
  target.source_build_phase.files_references.any? do |ref|
    ref.real_path.to_s == file_abs_path
  end ||
    target.project.files.any? { |ref| ref.real_path.to_s == file_abs_path }
end

def add_file(project, target, rel_path, compile, group_path, ios_TJBot_root)
  abs_path = File.join(ios_TJBot_root, rel_path)
  unless File.exist?(abs_path)
    log "  · skip (file not on disk yet): #{rel_path}"
    return :skipped
  end

  if file_already_referenced?(target, abs_path)
    log "  · already in project: #{rel_path}"
    return :noop
  end

  group = find_or_create_group(project, group_path)
  # group.new_reference accepts either an absolute or source-tree-relative
  # path. Using absolute lets xcodeproj compute the SOURCE_ROOT-relative
  # form automatically.
  file_ref = group.new_reference(abs_path)

  if compile
    target.source_build_phase.add_file_reference(file_ref)
    log "  + added to Compile Sources: #{rel_path}"
  else
    log "  + added file reference only: #{rel_path}"
  end
  :added
end

def apply_build_settings(target)
  changed_any = false
  target.build_configurations.each do |cfg|
    BUILD_SETTINGS.each do |key, value|
      current = cfg.build_settings[key]
      next if current == value
      cfg.build_settings[key] = value
      log "  + #{cfg.name}: set #{key}=#{value} (was #{current.inspect})"
      changed_any = true
    end
  end
  changed_any
end

def main
  unless File.directory?(PROJECT_PATH)
    abort "project not found at #{PROJECT_PATH}"
  end

  log "opening #{PROJECT_PATH}"
  project = Xcodeproj::Project.open(PROJECT_PATH)
  target = project.targets.find { |t| t.name == TARGET_NAME }
  abort "target '#{TARGET_NAME}' not found" unless target

  ios_TJBot_root = File.expand_path('../ios/TJBotMobile', __dir__)

  log "adding files to target #{target.name}"
  stats = { added: 0, noop: 0, skipped: 0 }
  FILES.each do |rel, compile, group_path|
    result = add_file(project, target, rel, compile, group_path, ios_TJBot_root)
    stats[result] += 1
  end

  log "applying build settings"
  settings_changed = apply_build_settings(target)

  if stats[:added].zero? && !settings_changed
    log "no changes — project already activated"
    exit 0
  end

  log "saving project.pbxproj"
  project.save

  log "summary: +#{stats[:added]} added, #{stats[:noop]} already present, #{stats[:skipped]} not on disk yet"
  log "next: cd ios && pod install"
end

main
