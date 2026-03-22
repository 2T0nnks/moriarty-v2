## macOS Prerequisites

This guide covers the necessary steps to prepare a macOS system for running the application with Docker.

### Step 1: Install Docker Desktop

Docker Desktop for macOS bundles the Docker Engine, Docker CLI, and Docker Compose into a single, easy-to-install application.

1.  Download the official installer from the Docker website. Make sure to choose the correct version for your Mac's processor (Apple Silicon or Intel).
    -   **[Download Docker Desktop for macOS](https://www.docker.com/products/docker-desktop/)**

2.  Open the downloaded `.dmg` file and drag the Docker icon to your Applications folder.
3.  Launch Docker from your Applications folder.
4.  The first time you run it, Docker will ask for privileged access to install its networking components. Enter your macOS password.
5.  Wait for the whale icon in the menu bar to become stable (not animating).

### Step 2: Install Git

Git is required to clone the project repository. macOS typically comes with Git pre-installed as part of the Command Line Tools.

1.  Open the **Terminal** app.
2.  Run the following command to check if Git is installed:

    ```bash
    git --version
    ```

3.  If Git is not installed, a pop-up window will appear, prompting you to install the Command Line Tools. Click **"Install"** and follow the instructions.

With these steps completed, your system is ready. You can now proceed with the installation instructions in the main [README.md](../../../README.md).
