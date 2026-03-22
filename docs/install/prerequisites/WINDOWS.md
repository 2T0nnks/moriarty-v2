## Windows Prerequisites

This guide covers the necessary steps to prepare a Windows 10/11 system for running the application with Docker.

### Step 1: Enable Virtualization in BIOS/UEFI

Virtualization is required for both WSL2 and Docker Desktop. Most modern computers have it enabled by default, but it's essential to verify.

1.  **Reboot your computer** and enter the BIOS/UEFI setup. Common keys to access it are `F2`, `F10`, `F12`, or `Del`.
2.  Look for settings named **"Virtualization Technology"**, **"Intel VT-x"**, or **"AMD-V"**.
3.  Ensure this setting is **Enabled**.
4.  Save changes and exit.

### Step 2: Install WSL2 (Windows Subsystem for Linux)

WSL2 is the backend that Docker Desktop uses on Windows. It provides a lightweight, full Linux kernel running directly on Windows.

1.  Open **PowerShell as Administrator**.
2.  Run the following command to install WSL2 and the default Ubuntu distribution:

    ```powershell
    wsl --install
    ```

3.  After the installation, **reboot your computer** as prompted.

### Step 3: Install Docker Desktop

Docker Desktop for Windows bundles the Docker Engine, Docker CLI, and Docker Compose into a single, easy-to-install application.

1.  Download the official installer from the Docker website:
    -   **[Download Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)**

2.  Run the downloaded installer (`Docker Desktop Installer.exe`).
3.  Follow the on-screen instructions. Ensure the **"Use WSL 2 instead of Hyper-V"** option is checked.
4.  Once installed, Docker Desktop will start automatically. Wait for the whale icon in the system tray to become stable (not animating).

### Step 4: Install Git

Git is required to clone the project repository.

1.  Download the official installer:
    -   **[Download Git for Windows](https://git-scm.com/download/win)**

2.  Run the installer and accept the default settings.

With these steps completed, your system is ready. You can now proceed with the installation instructions in the main [README.md](../../../README.md).
