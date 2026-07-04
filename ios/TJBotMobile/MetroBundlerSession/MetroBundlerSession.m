#import <React/RCTBridgeModule.h>
#import <React/RCTBundleURLProvider.h>

static NSString *const kTJBotMetroBundlerHostKey = @"TJBotMetroBundlerHost";
static NSString *const kTJBotMetroBundlerSchemeKey = @"TJBotMetroBundlerScheme";
static NSString *const kTJBotMetroPublicIpKey = @"TJBotMetroPublicIp";

@interface MetroBundlerSession : NSObject <RCTBridgeModule>
@end

@implementation MetroBundlerSession

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

RCT_EXPORT_METHOD(applySession:(NSString *)host
                  scheme:(NSString *)scheme
                  publicIp:(NSString *)publicIp
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  if (host.length == 0) {
    reject(@"metro_bundler_invalid_host", @"bundler host is required", nil);
    return;
  }

  NSString *resolvedScheme = scheme.length > 0 ? scheme : @"https";
  NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
  [defaults setObject:host forKey:kTJBotMetroBundlerHostKey];
  [defaults setObject:resolvedScheme forKey:kTJBotMetroBundlerSchemeKey];
  [defaults setObject:publicIp ?: @"" forKey:kTJBotMetroPublicIpKey];
  [defaults synchronize];

  RCTBundleURLProvider *provider = [RCTBundleURLProvider sharedSettings];
  [provider setPackagerScheme:resolvedScheme];
  [provider setJsLocation:host];

  resolve(@YES);
}

@end