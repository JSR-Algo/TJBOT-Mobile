internal import Expo
import React
import ReactAppDependencyProvider

@objc(TJBotExpoRuntime)
final class TJBotExpoRuntime: NSObject {
  private let reactNativeDelegate: TJBotReactNativeDelegate
  private let reactNativeFactory: ExpoReactNativeFactory

  override init() {
    let delegate = TJBotReactNativeDelegate()
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = ExpoReactNativeFactory(delegate: delegate)
    super.init()
  }

  @objc(startWithModuleName:inWindow:launchOptions:)
  func start(
    moduleName: String,
    in window: UIWindow,
    launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) {
    reactNativeFactory.startReactNative(
      withModuleName: moduleName,
      in: window,
      launchOptions: launchOptions
    )
  }
}

private final class TJBotReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
