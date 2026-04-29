//
//  PcmStreamModule.m
//  TbotMobile — RN bridge for Swift PcmStreamModule (sys-16 Gemini Live).
//
//  Method signatures here MUST match the @objc(selector:) annotations on
//  PcmStreamModule.swift. Drift = silently unreachable from JS. See Android
//  counterpart: android/app/src/main/java/com/tbotmobile/pcmstream/
//  PcmStreamModule.kt
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(PcmStreamModule, RCTEventEmitter)

// JS expects `init(rate)` to match the Android contract but Swift cannot
// expose a method literally named `init` (reserved for initializers). The
// remap macros RN provides only register method bodies, not extern decls;
// so we expose the selector as `initWithRate:resolver:rejecter:` on iOS
// and the JS shim in src/audio/PcmStreamPlayer.ts picks whichever of
// `init` or `initWithRate` is defined on the native module.
RCT_EXTERN_METHOD(initWithRate:(nonnull NSNumber *)rate
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(feed:(nonnull NSString *)base64
                  responseId:(nonnull NSString *)responseId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(startResponse:(nonnull NSString *)rid
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(pause:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(resume:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clear:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(close:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(playbackPosition:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(endTurn:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup { return NO; }

@end
