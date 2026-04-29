//
//  VoiceMicModule.m
//  TbotMobile — RN bridge for Swift VoiceMicModule (sys-16 Gemini Live).
//
//  Method signatures MUST match the @objc(selector:) annotations on
//  VoiceMicModule.swift. See JS shim at src/native/VoiceMic.ts.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(VoiceMicModule, RCTEventEmitter)

RCT_EXTERN_METHOD(start:(nonnull NSDictionary *)opts
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stop:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(mute:(nonnull NSNumber *)muted
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setAecFallbackGate:(nonnull NSNumber *)enabled
                  threshold:(nonnull NSNumber *)threshold
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getDiagnostics:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup { return NO; }

@end
