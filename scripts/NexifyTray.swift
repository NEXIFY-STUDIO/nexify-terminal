import Cocoa
import Foundation
import Network

class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
    var statusItem: NSStatusItem!
    var timer: Timer?

    func applicationDidFinishLaunching(_ aNotification: Notification) {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let button = statusItem.button {
            // macOS standard terminal icon
            button.image = NSImage(systemSymbolName: "terminal.fill", accessibilityDescription: "Nexify Terminal")
        }

        let menu = NSMenu()
        menu.delegate = self
        statusItem.menu = menu

        // Initial menu build
        buildMenu()

        // Start a gentle background timer to update the icon color depending on status
        timer = Timer.scheduledTimer(timeInterval: 10.0, target: self, selector: #selector(checkStatusInBackground), userInfo: nil, repeats: true)
        checkStatusInBackground()
    }

    @objc func checkStatusInBackground() {
        checkAllServices { uiOnline, apiOnline, proxyOnline in
            DispatchQueue.main.async {
                let allOnline = uiOnline && apiOnline && proxyOnline
                if let button = self.statusItem.button {
                    if allOnline {
                        // Default icon (looks good in dark/light mode)
                        button.contentTintColor = nil
                    } else {
                        // Highlight orange/red if something is offline
                        button.contentTintColor = NSColor.systemOrange
                    }
                }
            }
        }
    }

    // Called automatically before the menu opens
    func menuWillOpen(_ menu: NSMenu) {
        buildMenu()
    }

    func buildMenu() {
        guard let menu = statusItem.menu else { return }
        menu.removeAllItems()

        // 1. Header
        let titleItem = NSMenuItem(title: "Nexify Terminal", action: nil, keyEquivalent: "")
        let attrs: [NSAttributedString.Key: Any] = [.font: NSFont.boldSystemFont(ofSize: 14)]
        titleItem.attributedTitle = NSAttributedString(string: "Nexify Terminal", attributes: attrs)
        menu.addItem(titleItem)
        menu.addItem(NSMenuItem.separator())

        // 2. Status placeholders (updated async)
        let uiStatus = NSMenuItem(title: "● Web UI (3002): Checking...", action: nil, keyEquivalent: "")
        let apiStatus = NSMenuItem(title: "● Hacking API (3021): Checking...", action: nil, keyEquivalent: "")
        let proxyStatus = NSMenuItem(title: "● AI Proxy (8788): Checking...", action: nil, keyEquivalent: "")
        menu.addItem(uiStatus)
        menu.addItem(apiStatus)
        menu.addItem(proxyStatus)

        // Asynchronously check and update
        checkAllServices { ui, api, proxy in
            DispatchQueue.main.async {
                uiStatus.title = "● Web UI (3002): " + (ui ? "Online" : "Offline")
                apiStatus.title = "● Hacking API (3021): " + (api ? "Online" : "Offline")
                proxyStatus.title = "● AI Proxy (8788): " + (proxy ? "Online" : "Offline")
                uiStatus.attributedTitle = self.colorizedStatus(uiStatus.title, isOnline: ui)
                apiStatus.attributedTitle = self.colorizedStatus(apiStatus.title, isOnline: api)
                proxyStatus.attributedTitle = self.colorizedStatus(proxyStatus.title, isOnline: proxy)
            }
        }

        menu.addItem(NSMenuItem.separator())

        // 3. Controls
        let startItem = NSMenuItem(title: "Start Services", action: #selector(startServices), keyEquivalent: "s")
        startItem.target = self
        menu.addItem(startItem)

        let stopItem = NSMenuItem(title: "Stop Services", action: #selector(stopServices), keyEquivalent: "x")
        stopItem.target = self
        menu.addItem(stopItem)

        menu.addItem(NSMenuItem.separator())

        // 4. Network Info
        let tailscaleIP = getTailscaleIP()
        let wifiIP = getWiFiIP()

        let tsMenu = NSMenuItem(title: "Tailscale IP: \(tailscaleIP)", action: #selector(copyToClipboard(_:)), keyEquivalent: "")
        tsMenu.target = self
        tsMenu.representedObject = tailscaleIP
        menu.addItem(tsMenu)

        let wifiMenu = NSMenuItem(title: "Local IP: \(wifiIP)", action: #selector(copyToClipboard(_:)), keyEquivalent: "")
        wifiMenu.target = self
        wifiMenu.representedObject = wifiIP
        menu.addItem(wifiMenu)

        menu.addItem(NSMenuItem.separator())

        // 5. Open Web
        let openMac = NSMenuItem(title: "Open UI on Mac", action: #selector(openWebMac), keyEquivalent: "o")
        openMac.target = self
        menu.addItem(openMac)

        if tailscaleIP != "Not Found" && !tailscaleIP.isEmpty {
            let copyUrl = NSMenuItem(title: "Copy iPhone URL", action: #selector(copyToClipboard(_:)), keyEquivalent: "c")
            copyUrl.target = self
            copyUrl.representedObject = "http://\(tailscaleIP):3002/"
            menu.addItem(copyUrl)
        }

        menu.addItem(NSMenuItem.separator())

        // 6. Logs & Diagnostics
        let logsMenu = NSMenuItem(title: "Logs & Diagnostics", action: nil, keyEquivalent: "")
        let subMenu = NSMenu()
        let outLog = NSMenuItem(title: "View Output Log", action: #selector(viewOutLog), keyEquivalent: "")
        outLog.target = self
        subMenu.addItem(outLog)
        let errLog = NSMenuItem(title: "View Error Log", action: #selector(viewErrLog), keyEquivalent: "")
        errLog.target = self
        subMenu.addItem(errLog)
        logsMenu.submenu = subMenu
        menu.addItem(logsMenu)

        menu.addItem(NSMenuItem.separator())

        let quitItem = NSMenuItem(title: "Quit Nexify Tray", action: #selector(quit), keyEquivalent: "q")
        quitItem.target = self
        menu.addItem(quitItem)
    }

    func colorizedStatus(_ text: String, isOnline: Bool) -> NSAttributedString {
        let color = isOnline ? NSColor.systemGreen : NSColor.systemRed
        return NSAttributedString(string: text, attributes: [.foregroundColor: color])
    }

    @objc func copyToClipboard(_ sender: NSMenuItem) {
        if let str = sender.representedObject as? String {
            let pasteboard = NSPasteboard.general
            pasteboard.clearContents()
            pasteboard.setString(str, forType: .string)
        }
    }

    @objc func openWebMac() {
        if let url = URL(string: "http://localhost:3002/") {
            NSWorkspace.shared.open(url)
        }
    }

    @objc func viewOutLog() {
        let path = "/Users/erikbabcan/aaa-terminalnexify2-with-v-main/launchd-out.log"
        NSWorkspace.shared.openFile(path, withApplication: "Console")
    }

    @objc func viewErrLog() {
        let path = "/Users/erikbabcan/aaa-terminalnexify2-with-v-main/launchd-err.log"
        NSWorkspace.shared.openFile(path, withApplication: "Console")
    }

    @objc func startServices() {
        let plist = "/Users/erikbabcan/Library/LaunchAgents/com.nexify.terminal.plist"
        _ = runShellCommand("launchctl load \(plist)")
    }

    @objc func stopServices() {
        let plist = "/Users/erikbabcan/Library/LaunchAgents/com.nexify.terminal.plist"
        _ = runShellCommand("launchctl unload \(plist)")
    }

    @objc func quit() {
        NSApplication.shared.terminate(nil)
    }

    // --- Helpers ---

    func checkAllServices(completion: @escaping (Bool, Bool, Bool) -> Void) {
        let group = DispatchGroup()
        var ui = false
        var api = false
        var proxy = false

        group.enter()
        checkPortHTTP(port: 3002) { res in ui = res; group.leave() }

        group.enter()
        checkPortHTTP(port: 3021) { res in api = res; group.leave() }

        group.enter()
        checkPortHTTP(port: 8788) { res in proxy = res; group.leave() }

        group.notify(queue: .main) {
            completion(ui, api, proxy)
        }
    }

    func checkPortHTTP(port: Int, completion: @escaping (Bool) -> Void) {
        guard let url = URL(string: "http://127.0.0.1:\(port)/") else {
            completion(false)
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.timeoutInterval = 0.5 // 500ms
        
        let task = URLSession.shared.dataTask(with: request) { _, response, error in
            if let error = error as NSError? {
                if error.code == -1004 { // Connection refused
                    completion(false)
                    return
                }
            }
            if response != nil || error == nil {
                completion(true)
            } else {
                completion(false)
            }
        }
        task.resume()
    }

    func getTailscaleIP() -> String {
        let paths = [
            "/opt/homebrew/bin/tailscale",
            "/usr/local/bin/tailscale",
            "/Applications/Tailscale.app/Contents/Resources/bin/tailscale",
            "tailscale"
        ]
        for path in paths {
            let task = Process()
            let pipe = Pipe()
            task.standardOutput = pipe
            task.arguments = ["ip", "-4"]
            task.launchPath = path.hasPrefix("/") ? path : "/usr/bin/env"
            if !path.hasPrefix("/") {
                task.arguments = ["tailscale", "ip", "-4"]
            }
            if path.hasPrefix("/") && !FileManager.default.fileExists(atPath: path) {
                continue
            }
            do {
                try task.run()
                task.waitUntilExit()
                let data = pipe.fileHandleForReading.readDataToEndOfFile()
                if let ip = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines), !ip.isEmpty, !ip.contains("command not found") {
                    return ip
                }
            } catch {
                continue
            }
        }
        return "Not Found"
    }

    func getWiFiIP() -> String {
        var address: String = "Not Found"
        var ifaddr: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&ifaddr) == 0 else { return address }
        guard let firstAddr = ifaddr else { return address }
        
        for ptr in sequence(first: firstAddr, next: { $0.pointee.ifa_next }) {
            let flags = Int32(ptr.pointee.ifa_flags)
            var addr = ptr.pointee.ifa_addr.pointee
            if addr.sa_family == UInt8(AF_INET) {
                if (flags & IFF_UP) == IFF_UP && (flags & IFF_LOOPBACK) != IFF_LOOPBACK {
                    let name = String(cString: ptr.pointee.ifa_name)
                    if name == "en0" { // typical Wi-Fi on Mac
                        var hostname = [CChar](repeating: 0, count: Int(NI_MAXHOST))
                        if getnameinfo(&addr, socklen_t(addr.sa_len), &hostname, socklen_t(hostname.count), nil, socklen_t(0), NI_NUMERICHOST) == 0 {
                            address = String(cString: hostname)
                            break
                        }
                    }
                }
            }
        }
        freeifaddrs(ifaddr)
        return address
    }

    func runShellCommand(_ command: String) -> String {
        let task = Process()
        let pipe = Pipe()
        task.standardOutput = pipe
        task.standardError = pipe
        task.arguments = ["-c", command]
        task.launchPath = "/bin/bash"
        task.environment = ProcessInfo.processInfo.environment
        task.launch()
        task.waitUntilExit()
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        if let output = String(data: data, encoding: .utf8) {
            return output.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        return ""
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory) // Do not show in Dock
app.run()
