import customtkinter as ctk
import tkinter as tk
import os
import json
import socket
import threading
import requests
from PIL import Image
import pystray
import socketio
import time
from pystray import MenuItem as item
from tkinter import simpledialog

# Setup CustomTkinter Theme
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

CONFIG_FILE = os.path.join(os.path.expanduser("~"), ".it-support-config.json")
DEFAULT_CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "default-config.json")

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def format_server_ip(ip):
    ip = ip.strip()
    if not ip.startswith("http://") and not ip.startswith("https://"):
        ip = "http://" + ip
    if len(ip.split(":")) == 2:
        ip += ":4000"
    return ip

class ITSupportApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        self.title("IT Support")
        self.geometry("320x420")
        self.resizable(False, False)
        # Frameless window like the Electron one
        self.overrideredirect(True)
        # Always on top
        self.attributes("-topmost", True)
        
        # Center the window on the screen
        self.update_idletasks()
        screen_width = self.winfo_screenwidth()
        screen_height = self.winfo_screenheight()
        x = int((screen_width / 2) - (320 / 2))
        y = int((screen_height / 2) - (420 / 2))
        self.geometry(f"320x420+{x}+{y}")

        # Hide on focus loss
        self.bind("<FocusOut>", self.on_focus_out)

        self.load_config()
        
        # Setup Views
        self.main_frame = MainView(self)
        self.settings_frame = SettingsView(self)
        
        self.main_frame.pack(fill="both", expand=True)

        self.icon_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icon.png")
        if not os.path.exists(self.icon_path):
            # Create a blank transparent image if icon doesn't exist
            Image.new("RGBA", (64, 64), (0, 0, 0, 0)).save(self.icon_path)
            
        self.setup_tray()
        self.start_socketio()
        
    def load_config(self):
        self.config = {}
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r") as f:
                    self.config = json.load(f)
            except Exception:
                pass
                
        default_ip = "http://localhost:4000"
        if not self.config.get("serverIp") and os.path.exists(DEFAULT_CONFIG_FILE):
            try:
                with open(DEFAULT_CONFIG_FILE, "r") as f:
                    default_conf = json.load(f)
                if "serverIp" in default_conf:
                    default_ip = default_conf["serverIp"]
            except Exception:
                pass

        self.config_data = {
            "pcNumber": self.config.get("pcNumber", socket.gethostname()),
            "username": self.config.get("username", os.getlogin()),
            "serverIp": self.config.get("serverIp", default_ip),
            "localIp": get_local_ip()
        }

    def save_config(self, pc_num, username, server_ip):
        server_ip = format_server_ip(server_ip)
        self.config_data["pcNumber"] = pc_num
        self.config_data["username"] = username
        self.config_data["serverIp"] = server_ip
        
        with open(CONFIG_FILE, "w") as f:
            json.dump({
                "pcNumber": pc_num,
                "username": username,
                "serverIp": server_ip
            }, f)
            
    def switch_to_settings(self):
        self.main_frame.pack_forget()
        self.settings_frame.pack(fill="both", expand=True)
        self.settings_frame.populate()

    def switch_to_main(self):
        self.settings_frame.pack_forget()
        self.main_frame.pack(fill="both", expand=True)

    def on_focus_out(self, event):
        if str(event.widget) == str(self):
            # If the application completely loses focus, focus_get() returns None
            if self.focus_get() is None:
                self.withdraw()

    def toggle_window(self):
        if self.state() == "withdrawn":
            self.deiconify()
            self.focus_force()
        else:
            self.withdraw()
            
    def setup_tray(self):
        image = Image.open(self.icon_path)
        
        def on_open(icon, item):
            self.after(0, self.toggle_window)
            
        menu = pystray.Menu(
            item('Open IT Support', on_open, default=True),
            item('Quit', lambda icon, item: self.quit_app())
        )
        self.tray_icon = pystray.Icon("name", image, "IT Support Request", menu)
        # Tray needs to run in a separate thread
        threading.Thread(target=self.tray_icon.run, daemon=True).start()
        
    def quit_app(self):
        if self.tray_icon:
            self.tray_icon.stop()
        if hasattr(self, 'sio') and self.sio.connected:
            self.sio.disconnect()
        self.destroy()

    def start_socketio(self):
        self.sio = socketio.Client(reconnection=True, reconnection_delay=1, reconnection_delay_max=5)
        
        @self.sio.event
        def connect():
            self.sio.emit('register', {
                'pcNumber': self.config_data['pcNumber'],
                'ipAddress': self.config_data['localIp']
            })
            
        @self.sio.event
        def broadcast_message(data):
            msg = data.get("message", "")
            if msg:
                self.after(0, lambda: self.show_broadcast(msg))

        def run_sio():
            server_url = self.config_data['serverIp']
            while True:
                try:
                    if not self.sio.connected:
                        self.sio.connect(server_url)
                        self.sio.wait()
                except Exception:
                    time.sleep(5)
                time.sleep(1)
                
        threading.Thread(target=run_sio, daemon=True).start()

    def show_broadcast(self, msg):
        win = ctk.CTkToplevel(self)
        win.title("IT Alert")
        win.geometry("450x300")
        win.attributes("-topmost", True)
        
        win.update_idletasks()
        screen_width = win.winfo_screenwidth()
        screen_height = win.winfo_screenheight()
        x = int((screen_width / 2) - (450 / 2))
        y = int((screen_height / 2) - (300 / 2))
        win.geometry(f"+{x}+{y}")
        
        win.bell()
        
        lbl_title = ctk.CTkLabel(win, text="Message received from AhasaTV IT System", font=ctk.CTkFont(size=16, weight="bold"), text_color="#38bdf8")
        lbl_title.pack(pady=(20, 10))
        
        txt = ctk.CTkTextbox(win, height=150, wrap="word", font=ctk.CTkFont(size=14))
        txt.pack(fill="both", expand=True, padx=20, pady=10)
        txt.insert("1.0", msg)
        txt.configure(state="disabled")
        
        btn = ctk.CTkButton(win, text="Dismiss", height=40, font=ctk.CTkFont(weight="bold"), command=win.destroy)
        btn.pack(pady=(0, 20))

class MainView(ctk.CTkFrame):
    def __init__(self, master):
        super().__init__(master, corner_radius=12, fg_color="#1e293b")
        self.app = master
        
        # Header
        self.header_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.header_frame.pack(fill="x", padx=15, pady=(15, 20))
        
        try:
            self.logo_img = ctk.CTkImage(light_image=Image.open(self.app.icon_path), size=(28, 28))
            self.logo_label = ctk.CTkLabel(self.header_frame, image=self.logo_img, text="")
            self.logo_label.pack(side="left")
        except Exception:
            pass
            
        self.title_label = ctk.CTkLabel(self.header_frame, text="AhasaTV Support", font=ctk.CTkFont(size=18, weight="bold"), text_color="#38bdf8")
        self.title_label.pack(side="left", padx=10)
        
        self.settings_btn = ctk.CTkButton(self.header_frame, text="⚙️", width=30, height=30, fg_color="transparent", hover_color="#334155", font=ctk.CTkFont(size=16), command=self.prompt_password)
        self.settings_btn.pack(side="right")
        
        self.min_btn = ctk.CTkButton(self.header_frame, text="➖", width=30, height=30, fg_color="transparent", hover_color="#334155", font=ctk.CTkFont(size=16), command=self.app.withdraw)
        self.min_btn.pack(side="right")

        # Status Box
        self.status_frame = ctk.CTkFrame(self, corner_radius=8, fg_color="#0f172a")
        self.status_frame.pack(fill="x", padx=15, pady=(0, 20), ipady=15)
        
        self.status_title = ctk.CTkLabel(self.status_frame, text="Ready", font=ctk.CTkFont(size=14, weight="bold"))
        self.status_title.pack(pady=(10, 0))
        self.status_desc = ctk.CTkLabel(self.status_frame, text="Click below to request help from IT.", font=ctk.CTkFont(size=12), text_color="#94a3b8")
        self.status_desc.pack()

        # Textarea
        self.message_box = ctk.CTkTextbox(self, height=70, corner_radius=6, border_width=1, border_color="#334155", fg_color="#0f172a")
        self.message_box.pack(fill="x", padx=15, pady=(0, 15))
        self.message_box.insert("1.0", "")
        # Add placeholder logic manually as textbox doesn't have it natively
        self.placeholder_text = "Optional: What do you need help with?"
        self.message_box.insert("1.0", self.placeholder_text)
        self.message_box.bind("<FocusIn>", self.clear_placeholder)
        self.message_box.bind("<FocusOut>", self.add_placeholder)

        # Request Button
        self.request_btn = ctk.CTkButton(self, text="Request Help", height=45, corner_radius=8, font=ctk.CTkFont(size=15, weight="bold"), command=self.send_request)
        self.request_btn.pack(fill="x", padx=15, pady=(0, 15))

    def prompt_password(self):
        pwd = simpledialog.askstring("Admin Access", "Enter IT Admin Password:", show="*", parent=self.app)
        if pwd == "admin123":
            self.app.switch_to_settings()

    def clear_placeholder(self, event):
        if self.message_box.get("1.0", "end-1c") == self.placeholder_text:
            self.message_box.delete("1.0", "end")
            
    def add_placeholder(self, event):
        if self.message_box.get("1.0", "end-1c") == "":
            self.message_box.insert("1.0", self.placeholder_text)

    def send_request(self):
        msg = self.message_box.get("1.0", "end-1c")
        if msg == self.placeholder_text:
            msg = ""
            
        self.request_btn.configure(state="disabled", text="Verifying & Sending...")
        self.status_title.configure(text="Sending", text_color="white")
        self.status_desc.configure(text="Connecting to IT support service...", text_color="#94a3b8")
        
        # Run request in separate thread so UI doesn't freeze
        threading.Thread(target=self._make_request, args=(msg,), daemon=True).start()

    def _make_request(self, msg):
        conf = self.app.config_data
        url = f"{conf['serverIp']}/api/request-help"
        payload = {
            "pcNumber": conf['pcNumber'],
            "username": conf['username'],
            "ipAddress": conf['localIp'],
            "message": msg
        }
        
        try:
            resp = requests.post(url, json=payload, timeout=10)
            if resp.ok:
                self.app.after(0, lambda: self._request_success())
            else:
                err = resp.json().get("error", "Error contacting server.") if "application/json" in resp.headers.get("Content-Type", "") else "Error contacting server."
                self.app.after(0, lambda: self._request_error(err))
        except Exception as e:
            self.app.after(0, lambda: self._request_error("Cannot reach backend service. Check network or server IP."))

    def _request_success(self):
        self.request_btn.configure(text="Request Sent!", fg_color="#10b981", hover_color="#059669")
        self.status_title.configure(text="Success", text_color="#10b981")
        self.status_desc.configure(text="IT has been notified. Awaiting technician.", text_color="#10b981")
        self.message_box.delete("1.0", "end")
        self.add_placeholder(None)
        
        # Reset after 7 seconds
        self.app.after(7000, self._reset_btn)

    def _request_error(self, err_text):
        self.request_btn.configure(state="normal", text="Request Help", fg_color="#1f538d")
        self.status_title.configure(text="Error", text_color="#ef4444")
        self.status_desc.configure(text=err_text, text_color="#ef4444")

    def _reset_btn(self):
        self.request_btn.configure(state="normal", text="Request Help", fg_color="#1f538d", hover_color="#14375e")
        self.status_title.configure(text="Ready", text_color="white")
        self.status_desc.configure(text="Click below to request help from IT.", text_color="#94a3b8")

class SettingsView(ctk.CTkFrame):
    def __init__(self, master):
        super().__init__(master, corner_radius=12, fg_color="#1e293b")
        self.app = master
        
        # Header
        self.header_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.header_frame.pack(fill="x", padx=15, pady=(15, 20))
        
        self.title_label = ctk.CTkLabel(self.header_frame, text="Settings", font=ctk.CTkFont(size=18, weight="bold"), text_color="white")
        self.title_label.pack(side="left")
        
        self.back_btn = ctk.CTkButton(self.header_frame, text="❌", width=30, height=30, fg_color="transparent", hover_color="#334155", font=ctk.CTkFont(size=16), command=self.app.switch_to_main)
        self.back_btn.pack(side="right")
        
        # Form
        self.form_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.form_frame.pack(fill="both", expand=True, padx=15)
        
        ctk.CTkLabel(self.form_frame, text="PC Number", text_color="#94a3b8").pack(anchor="w", pady=(0, 2))
        self.pc_entry = ctk.CTkEntry(self.form_frame, height=35)
        self.pc_entry.pack(fill="x", pady=(0, 15))
        
        ctk.CTkLabel(self.form_frame, text="Username", text_color="#94a3b8").pack(anchor="w", pady=(0, 2))
        self.user_entry = ctk.CTkEntry(self.form_frame, height=35)
        self.user_entry.pack(fill="x", pady=(0, 15))
        
        ctk.CTkLabel(self.form_frame, text="Server IP", text_color="#94a3b8").pack(anchor="w", pady=(0, 2))
        self.ip_entry = ctk.CTkEntry(self.form_frame, height=35)
        self.ip_entry.pack(fill="x", pady=(0, 15))
        
        # Action Buttons
        self.actions_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.actions_frame.pack(fill="x", padx=15, pady=(0, 20))
        
        self.save_btn = ctk.CTkButton(self.actions_frame, text="Save", height=40, font=ctk.CTkFont(weight="bold"), command=self.save)
        self.save_btn.pack(side="left", fill="x", expand=True, padx=(0, 5))
        
        self.quit_btn = ctk.CTkButton(self.actions_frame, text="Exit App", height=40, fg_color="#ef4444", hover_color="#dc2626", font=ctk.CTkFont(weight="bold"), command=self.app.quit_app)
        self.quit_btn.pack(side="right", fill="x", expand=True, padx=(5, 0))

    def populate(self):
        conf = self.app.config_data
        self.pc_entry.delete(0, "end")
        self.pc_entry.insert(0, conf["pcNumber"])
        self.user_entry.delete(0, "end")
        self.user_entry.insert(0, conf["username"])
        self.ip_entry.delete(0, "end")
        self.ip_entry.insert(0, conf["serverIp"])

    def save(self):
        self.app.save_config(self.pc_entry.get(), self.user_entry.get(), self.ip_entry.get())
        self.app.switch_to_main()

if __name__ == "__main__":
    app = ITSupportApp()
    app.mainloop()
