## GPU Acceleration Setup for AI Assistant

To achieve significantly faster AI responses, you can configure Moriarty to use your GPU for local model inference with Ollama. This guide provides instructions for NVIDIA, AMD, and Vulkan-compatible GPUs.

**IMPORTANT:** GPU acceleration is only supported on **Linux** and **Windows (with WSL2)**. macOS users are limited to CPU-based inference.

---

### 1. NVIDIA (CUDA)

This is the most stable and recommended method for GPU acceleration if you have a compatible NVIDIA card.

**Prerequisites:**
- An NVIDIA GPU with CUDA support (most modern NVIDIA GPUs).
- The official **NVIDIA driver** for your GPU must be installed on your host system.
- **NVIDIA Container Toolkit** must be installed.

**Setup Steps:**

1.  **Install NVIDIA Drivers:**
    -   Ensure you have the latest proprietary NVIDIA drivers installed. You can usually do this through your Linux distribution's driver manager or by downloading them from the [NVIDIA website](https://www.nvidia.com/Download/index.aspx).

2.  **Install NVIDIA Container Toolkit:**
    -   This toolkit allows Docker containers to access your GPU. Follow the official installation guide for your Linux distribution:
        > [**NVIDIA Container Toolkit Installation Guide**](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html)

3.  **Verify the Installation:**
    -   After installation, run the following command to test if Docker can see your GPU. It should execute without errors and show your GPU details.
        ```bash
        docker run --rm --gpus all nvidia/cuda:12.1.1-base-ubuntu22.04 nvidia-smi
        ```

4.  **Run Moriarty with NVIDIA Support:**
    -   Use the `docker-compose.nvidia.yml` file, which configures the Ollama service to use the NVIDIA runtime.
        ```bash
        docker-compose -f docker-compose.yml -f docker-compose.ai.yml -f docker-compose.nvidia.yml up --build
        ```

---

### 2. AMD (ROCm)

This method is for modern AMD GPUs (RDNA2 architecture or newer) on **Linux only**.

**Prerequisites:**
- A supported AMD GPU (e.g., Radeon RX 6000 series or newer).
- **ROCm drivers** installed on your host system.

**Setup Steps:**

1.  **Install ROCm Drivers:**
    -   Follow the official AMD guide to install the ROCm drivers for your specific Linux distribution.
        > [**ROCm Installation Guide**](https://rocm.docs.amd.com/projects/install-on-linux/en/latest/)

2.  **Add your user to the `render` and `video` groups:**
    -   This is required for Docker to access the GPU hardware.
        ```bash
        sudo usermod -aG render,video $USER
        ```
    -   You will need to **log out and log back in** for this change to take effect.

3.  **Run Moriarty with AMD Support:**
    -   Use the `docker-compose.amd.yml` file.
        ```bash
        docker-compose -f docker-compose.yml -f docker-compose.ai.yml -f docker-compose.amd.yml up --build
        ```

---

### 3. Vulkan (Experimental)

This method can provide GPU acceleration for a wider range of GPUs, including older AMD cards and Intel integrated graphics, but is considered experimental.

**Prerequisites:**
- A Vulkan-compatible GPU.
- The latest **Vulkan drivers** for your GPU installed on your host system.

**Setup Steps:**

1.  **Install Vulkan Drivers:**
    -   **Intel:** `sudo apt-get install mesa-vulkan-drivers`
    -   **AMD:** `sudo apt-get install mesa-vulkan-drivers`

2.  **Run Moriarty with Vulkan Support:**
    -   Use the `docker-compose.vulkan.yml` file.
        ```bash
        docker-compose -f docker-compose.yml -f docker-compose.ai.yml -f docker-compose.vulkan.yml up --build
        ```
