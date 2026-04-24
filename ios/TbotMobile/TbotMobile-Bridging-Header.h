//
//  TbotMobile-Bridging-Header.h
//
//  Required when the iOS target contains both Objective-C/C++ and Swift
//  files. Xcode normally auto-creates this header the first time a .swift
//  file is added to the target; if that has not happened yet, copy this
//  template to `ios/TbotMobile/TbotMobile-Bridging-Header.h` and set the
//  `SWIFT_OBJC_BRIDGING_HEADER` build setting to
//  `TbotMobile/TbotMobile-Bridging-Header.h` in the Xcode project.
//
//  React Native headers are exposed to Swift via this header. Add new
//  #import lines here only if a Swift source file needs to call into
//  a new ObjC API.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTBridge.h>
#import <React/RCTUtils.h>
