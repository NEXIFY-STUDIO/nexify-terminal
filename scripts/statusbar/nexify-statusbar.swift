import AppKit
import Foundation

final class StatusBarController: NSObject, NSApplicationDelegate {
  private let port = ProcessInfo.processInfo.environment["NEXIFY_STATUS_PORT"] ?? "3322"
  private var appURL: URL {
    URL(string: "http://127.0.0.1:\(port)/api/health")!
  }
  private var appRootURL: URL {
    URL(string: "http://127.0.0.1:\(port)/")!
  }
  private var statusItem: NSStatusItem!
  private var timer: Timer?
  private var isOnline = false

  func applicationDidFinishLaunching(_ notification: Notification) {
    NSApp.setActivationPolicy(.accessory)

    statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    statusItem.button?.title = "NX"
    statusItem.button?.imagePosition = .imageLeading
    statusItem.button?.imageScaling = .scaleProportionallyDown

    let menu = NSMenu()
    menu.addItem(NSMenuItem(title: "Open Nexify", action: #selector(openApp), keyEquivalent: "o"))
    menu.addItem(NSMenuItem.separator())
    menu.addItem(NSMenuItem(title: "Quit", action: #selector(quitApp), keyEquivalent: "q"))
    menu.items.forEach { $0.target = self }
    statusItem.menu = menu

    refreshStatus()
    timer = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in
      self?.refreshStatus()
    }
    if let timer {
      RunLoop.main.add(timer, forMode: .common)
    }
  }

  @objc private func openApp() {
    NSWorkspace.shared.open(appRootURL)
  }

  @objc private func quitApp() {
    NSApp.terminate(nil)
  }

  private func refreshStatus() {
    var request = URLRequest(url: appURL)
    request.httpMethod = "GET"
    request.cachePolicy = .reloadIgnoringLocalCacheData
    request.timeoutInterval = 2

    URLSession.shared.dataTask(with: request) { [weak self] _, response, error in
      let httpResponse = response as? HTTPURLResponse
      let online = error == nil && httpResponse?.statusCode == 200

      DispatchQueue.main.async {
        self?.applyStatus(online: online)
      }
    }.resume()
  }

  private func applyStatus(online: Bool) {
    guard online != isOnline || statusItem.button?.image == nil else {
      return
    }

    isOnline = online

    let symbolName = online ? "circle.fill" : "circle"
    let image = NSImage(systemSymbolName: symbolName, accessibilityDescription: online ? "Nexify online" : "Nexify offline")
    image?.isTemplate = true
    statusItem.button?.image = image
    statusItem.button?.contentTintColor = online ? .systemGreen : .systemRed
    statusItem.button?.toolTip = online ? "Nexify is online" : "Nexify is offline"
  }
}

@main
struct NexifyStatusBarMain {
  static func main() {
    let app = NSApplication.shared
    let controller = StatusBarController()
    app.delegate = controller
    app.run()
  }
}
