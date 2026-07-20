//
//  VoiceSessionModule.m
//  tjbotMobile — React Native bridge registration for the Swift
//  VoiceSessionModule (sys-16 realtime voice).
//
//  Uses RCT_EXTERN_MODULE so the Swift class is discovered by React
//  Native's module system. Method signatures below MUST match the
//  @objc(selector:) annotations on VoiceSessionModule.swift — any drift
//  means the method is silently unreachable from JS.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(VoiceSessionModule, RCTEventEmitter)

RCT_EXTERN_METHOD(startSession:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(endSession:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setRoute:(NSString *)route
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getRoute:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// `reapplyCategory` was previously declared here but the Swift class
// never implemented it, so RN logged a "method signature can not be
// found" warning at every bridge registration. No JS caller depends on
// it (debug-probe only mentions it in a doc comment), so the cleanest
// fix is to drop the declaration. If the symptom this method was
// intended to recover from (sampleRate / ioBufferDuration mid-session
// shift, plan B race) reappears, re-add the bridge AND the Swift impl
// in lockstep.

RCT_EXTERN_METHOD(forceRecover:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getDiagnostics:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup { return NO; }

@end
