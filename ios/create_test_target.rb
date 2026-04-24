#!/usr/bin/env ruby
# Create the missing TbotMobileTests XCTest Unit Testing Bundle target.
# Wires in the 4 existing test .swift files, sets iOS 15.1 deployment target,
# configures Automatic signing with team 7Q65CFWBG8, and updates the shared
# scheme's TestableReference BlueprintIdentifier to match the new target.
# Runs via: ruby ios/create_test_target.rb

require 'xcodeproj'

PROJECT_PATH = File.join(__dir__, 'TbotMobile.xcodeproj')
SCHEME_PATH = File.join(PROJECT_PATH, 'xcshareddata', 'xcschemes', 'TbotMobile.xcscheme')
TESTS_DIR = 'TbotMobileTests'
TEST_FILES = %w[
  SharedEngineSpikeTests.swift
  VoiceSessionModuleTests.swift
  VoiceMicModuleTests.swift
  PcmStreamModuleTests.swift
]
DEPLOYMENT_TARGET = '15.1'
DEV_TEAM = '7Q65CFWBG8'
BUNDLE_ID = 'com.manhhodinh.tbot.TbotMobileTests'

proj = Xcodeproj::Project.open(PROJECT_PATH)

# Check if target already exists — idempotent re-run
existing = proj.targets.find { |t| t.name == 'TbotMobileTests' }
if existing
  puts "TbotMobileTests target already exists (UUID: #{existing.uuid}); skipping creation."
  exit 0
end

app_target = proj.targets.find { |t| t.name == 'TbotMobile' }
raise 'TbotMobile app target not found' unless app_target

# Create the Unit Testing Bundle target.
test_target = proj.new_target(
  :unit_test_bundle,
  'TbotMobileTests',
  :ios,
  DEPLOYMENT_TARGET,
  proj.products_group,
  :swift
)

# Add a file-reference group for the tests directory if not present.
tests_group = proj.main_group[TESTS_DIR] || proj.main_group.new_group(TESTS_DIR, TESTS_DIR)

# Wire every existing test .swift into Sources build phase.
TEST_FILES.each do |filename|
  abs = File.join(__dir__, TESTS_DIR, filename)
  unless File.exist?(abs)
    warn "WARN: #{filename} not found on disk at #{abs} — skipping"
    next
  end
  file_ref = tests_group.files.find { |f| f.path == filename } || tests_group.new_file(filename)
  test_target.add_file_references([file_ref])
end

# Tune build settings per target config (Debug + Release).
test_target.build_configurations.each do |cfg|
  bs = cfg.build_settings
  bs['IPHONEOS_DEPLOYMENT_TARGET']     = DEPLOYMENT_TARGET
  bs['PRODUCT_BUNDLE_IDENTIFIER']      = BUNDLE_ID
  bs['PRODUCT_NAME']                   = '$(TARGET_NAME)'
  bs['SWIFT_VERSION']                  = '5.0'
  bs['CODE_SIGN_STYLE']                = 'Automatic'
  bs['DEVELOPMENT_TEAM']               = DEV_TEAM
  bs['GENERATE_INFOPLIST_FILE']        = 'YES'
  bs['TARGETED_DEVICE_FAMILY']         = '1,2'
  bs['TEST_HOST']                      = '$(BUILT_PRODUCTS_DIR)/TbotMobile.app/$(BUNDLE_EXECUTABLE_FOLDER_PATH)/TbotMobile'
  bs['BUNDLE_LOADER']                  = '$(TEST_HOST)'
  bs['LD_RUNPATH_SEARCH_PATHS']        = ['$(inherited)', '@executable_path/Frameworks', '@loader_path/Frameworks']
  bs['CLANG_ENABLE_MODULES']           = 'YES'
  bs['SWIFT_EMIT_LOC_STRINGS']         = 'NO'
end

# Make the test target depend on the app target (ensures app is built + installed
# before tests run, which is required for host-app based unit tests on device).
test_target.add_dependency(app_target)

proj.save
puts "Created TbotMobileTests target with UUID: #{test_target.uuid}"
puts "Wired #{test_target.source_build_phase.files.count} source files."

# Now patch the shared scheme so the TestableReference points at the new UUID
# rather than the dangling 00E356ED1AD99517003FC87E hard-coded hint.
if File.exist?(SCHEME_PATH)
  scheme_xml = File.read(SCHEME_PATH)
  patched = scheme_xml.gsub(
    /BlueprintIdentifier = "[A-F0-9]{24}"(\s+BuildableName = "TbotMobileTests\.xctest")/,
    "BlueprintIdentifier = \"#{test_target.uuid}\"\\1"
  )
  if patched != scheme_xml
    File.write(SCHEME_PATH, patched)
    puts "Patched scheme TestableReference BlueprintIdentifier -> #{test_target.uuid}"
  else
    puts 'WARN: scheme already up-to-date or pattern mismatch — verify manually.'
  end
else
  warn "WARN: scheme not found at #{SCHEME_PATH}"
end
