import os
import sys
import platform
import shutil
import subprocess
import string
import uuid
import ctypes

class MEMORYSTATUSEX(ctypes.Structure):
    _fields_ = [
        ("dwLength", ctypes.c_ulong),
        ("dwMemoryLoad", ctypes.c_ulong),
        ("ullTotalPhys", ctypes.c_ulonglong),
        ("ullAvailPhys", ctypes.c_ulonglong),
        ("ullTotalPageFile", ctypes.c_ulonglong),
        ("ullAvailPageFile", ctypes.c_ulonglong),
        ("ullTotalVirtual", ctypes.c_ulonglong),
        ("ullAvailVirtual", ctypes.c_ulonglong),
        ("sullAvailExtendedVirtual", ctypes.c_ulonglong),
    ]

def _run_cmd(cmd):
    try:
        creation_flags = 0x08000000 if os.name == 'nt' else 0
        res = subprocess.check_output(cmd, creationflags=creation_flags, timeout=3, stderr=subprocess.DEVNULL)
        return res.decode('utf-8', errors='ignore').strip()
    except Exception:
        return ""

def get_cpu_info():
    model = ""
    if os.name == 'nt':
        out = _run_cmd(["powershell", "-NoProfile", "-Command", "(Get-CimInstance Win32_Processor).Name"])
        if out:
            model = out.splitlines()[0].strip()
    if not model:
        model = platform.processor() or "Generic Processor"
    cores = os.cpu_count() or 1
    return {
        "model": model,
        "cores": cores,
        "architecture": platform.machine()
    }

def get_ram_info():
    if os.name == 'nt':
        try:
            stat = MEMORYSTATUSEX()
            stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat))
            total_gb = round(stat.ullTotalPhys / (1024 ** 3), 1)
            avail_gb = round(stat.ullAvailPhys / (1024 ** 3), 1)
            used_gb = round(total_gb - avail_gb, 1)
            return {
                "total_gb": total_gb,
                "used_gb": used_gb,
                "free_gb": avail_gb,
                "percent": int(stat.dwMemoryLoad)
            }
        except Exception:
            pass
    return {
        "total_gb": 0,
        "used_gb": 0,
        "free_gb": 0,
        "percent": 0
    }

def get_disk_info():
    drives = []
    if os.name == 'nt':
        for letter in string.ascii_uppercase:
            path = f"{letter}:\\"
            if os.path.exists(path):
                try:
                    usage = shutil.disk_usage(path)
                    total_gb = round(usage.total / (1024 ** 3), 1)
                    free_gb = round(usage.free / (1024 ** 3), 1)
                    used_gb = round(usage.used / (1024 ** 3), 1)
                    pct = round((usage.used / usage.total) * 100) if usage.total else 0
                    drives.append({
                        "mount": f"{letter}:",
                        "total_gb": total_gb,
                        "used_gb": used_gb,
                        "free_gb": free_gb,
                        "percent": pct
                    })
                except Exception:
                    pass
    else:
        try:
            usage = shutil.disk_usage("/")
            drives.append({
                "mount": "/",
                "total_gb": round(usage.total / (1024 ** 3), 1),
                "used_gb": round(usage.used / (1024 ** 3), 1),
                "free_gb": round(usage.free / (1024 ** 3), 1),
                "percent": round((usage.used / usage.total) * 100) if usage.total else 0
            })
        except Exception:
            pass
    return drives

def get_gpu_info():
    if os.name == 'nt':
        out = _run_cmd(["powershell", "-NoProfile", "-Command", "(Get-CimInstance Win32_VideoController).Name"])
        if out:
            lines = [l.strip() for l in out.splitlines() if l.strip()]
            if lines:
                return ", ".join(lines)
    return "Integrated Graphics"

def get_system_model():
    if os.name == 'nt':
        out = _run_cmd(["powershell", "-NoProfile", "-Command", "$c = Get-CimInstance Win32_ComputerSystem; \"$($c.Manufacturer) $($c.Model)\""])
        if out:
            return out.strip()
    return platform.node()

def get_os_info():
    rel = platform.release()
    ver = platform.version()
    arch = platform.architecture()[0]
    return f"Windows {rel} ({arch}, Build {ver})"

def get_mac_address():
    try:
        raw = uuid.getnode()
        mac = ':'.join(['{:02x}'.format((raw >> ele) & 0xff) for ele in range(0, 8 * 6, 8)][::-1])
        return mac.upper()
    except Exception:
        return "N/A"

def get_comprehensive_hardware():
    return {
        "cpu": get_cpu_info(),
        "ram": get_ram_info(),
        "disks": get_disk_info(),
        "gpu": get_gpu_info(),
        "system": get_system_model(),
        "os": get_os_info(),
        "mac": get_mac_address()
    }

if __name__ == "__main__":
    import json
    print(json.dumps(get_comprehensive_hardware(), indent=2))
