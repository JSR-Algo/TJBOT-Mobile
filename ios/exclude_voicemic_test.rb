#!/usr/bin/env ruby
# Temporarily exclude VoiceMicModuleTests.swift from the TbotMobileTests
# target sources build phase. It references SharedVoiceEngine which requires
# @testable import TbotMobile, which in turn pulls the app target's bridging
# header + Pods include paths into the test target. Wiring that is B5 scope.
# For B1 (spike only), excluding is enough.
#
# Idempotent — safe to run if already excluded.

require 'xcodeproj'

PROJECT_PATH = File.join(__dir__, 'TbotMobile.xcodeproj')
EXCLUDE_NAME = 'VoiceMicModuleTests.swift'

proj = Xcodeproj::Project.open(PROJECT_PATH)

tests_target = proj.targets.find { |t| t.name == 'TbotMobileTests' }
abort 'TbotMobileTests target not found — run create_test_target.rb first' unless tests_target

sources_phase = tests_target.source_build_phase
before = sources_phase.files.count

sources_phase.files.dup.each do |build_file|
  ref = build_file.file_ref
  if ref && ref.path == EXCLUDE_NAME
    sources_phase.remove_build_file(build_file)
    puts "Removed #{EXCLUDE_NAME} from sources (was UUID #{build_file.uuid})"
  end
end

proj.save
after = tests_target.source_build_phase.files.count
puts "Sources: #{before} -> #{after}"
