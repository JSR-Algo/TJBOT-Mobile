#import "AppDelegate.h"

#if __has_include(<ExpoModulesCore/ExpoModulesCore-Swift.h>)
#import <ExpoModulesCore/ExpoModulesCore-Swift.h>
#else
#import "ExpoModulesCore-Swift.h"
#endif
#import "TJBOT-Swift.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>

static NSString *const kTJBotMetroBundlerHostKey = @"TJBotMetroBundlerHost";
static NSString *const kTJBotMetroBundlerSchemeKey = @"TJBotMetroBundlerScheme";

@interface AppDelegate ()

@property (nonatomic, strong) TJBotExpoRuntime *expoRuntime;

@end

@implementation AppDelegate

- (BOOL)isStaleMetroBundlerHost:(NSString *)host scheme:(NSString *)scheme
{
  if (host.length == 0) {
    return NO;
  }
  if ([scheme isEqualToString:@"https"]) {
    return YES;
  }
  if ([host rangeOfString:@"trycloudflare.com"].location != NSNotFound) {
    return YES;
  }
  return NO;
}

- (void)applyPersistedMetroBundlerSession
{
#if DEBUG
  NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
  NSString *host = [defaults stringForKey:kTJBotMetroBundlerHostKey];
  NSString *scheme = [defaults stringForKey:kTJBotMetroBundlerSchemeKey];

  if ([self isStaleMetroBundlerHost:host scheme:scheme]) {
    [defaults removeObjectForKey:kTJBotMetroBundlerHostKey];
    [defaults removeObjectForKey:kTJBotMetroBundlerSchemeKey];
    [defaults synchronize];
    host = nil;
    scheme = nil;
  }

  RCTBundleURLProvider *provider = [RCTBundleURLProvider sharedSettings];
  if (host.length > 0) {
    if (scheme.length > 0) {
      [provider setPackagerScheme:scheme];
    }
    [provider setJsLocation:host];
    return;
  }

  // Fall back to the packager host baked in at build time (.xcode.env.local).
  [provider setPackagerScheme:@"http"];
  [provider resetToDefaults];
#endif
}

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [self applyPersistedMetroBundlerSession];
  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  self.expoRuntime = [TJBotExpoRuntime new];
  [self.expoRuntime startWithModuleName:@"main"
                               inWindow:self.window
                          launchOptions:launchOptions];

  return YES;
}

- (BOOL)application:(UIApplication *)application
            openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  return [RCTLinkingManager application:application openURL:url options:options];
}

- (BOOL)application:(UIApplication *)application
continueUserActivity:(NSUserActivity *)userActivity
 restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler
{
  return [RCTLinkingManager application:application
                   continueUserActivity:userActivity
                     restorationHandler:restorationHandler];
}

@end
