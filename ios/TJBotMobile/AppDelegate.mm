#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>
#import <ReactAppDependencyProvider/RCTAppDependencyProvider.h>

static NSString *const kTJBotMetroBundlerHostKey = @"TJBotMetroBundlerHost";
static NSString *const kTJBotMetroBundlerSchemeKey = @"TJBotMetroBundlerScheme";

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
  self.moduleName = @"TJBotMobile";
  self.initialProps = @{};
  self.dependencyProvider = [RCTAppDependencyProvider new];
  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
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
