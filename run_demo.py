import asyncio
import os
import subprocess
from playwright.async_api import async_playwright

async def main():
    print("Stopping any existing instances...")
    os.system("kill -9 $(lsof -t -i :3000) 2>/dev/null || true")
    os.system("kill -9 $(lsof -t -i :8080) 2>/dev/null || true")

    print("Starting backend...")
    backend = subprocess.Popen(["./planshark-core/bin/server", "-data", "./data"])

    print("Starting frontend...")
    frontend = subprocess.Popen(["npm", "run", "dev"], cwd="planshark-dashboard")

    print("Waiting for servers to start...")
    await asyncio.sleep(5)

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                record_video_dir=".",
                record_video_size={"width": 1280, "height": 720}
            )
            page = await context.new_page()

            print("Navigating to dashboard...")
            await page.goto("http://localhost:3000")
            await asyncio.sleep(3)

            print("Navigating to Providers...")
            await page.click("text=Providers")
            await asyncio.sleep(2)

            print("Navigating to Agents...")
            await page.locator("nav").locator("text=Agents").click()
            await asyncio.sleep(2)

            print("Navigating to Agent Editor...")
            await page.click("text=Agent Editor")
            await asyncio.sleep(2)

            # Back to Dashboard
            print("Back to Dashboard...")
            await page.goto("http://localhost:3000")
            await asyncio.sleep(2)

            await context.close()
            await browser.close()

            for file in os.listdir("."):
                if file.endswith(".webm") and file != "demo.webm":
                    if os.path.exists("demo.webm"):
                        os.remove("demo.webm")
                    os.rename(file, "demo.webm")
                    print(f"Video saved as demo.webm")
                    break
    finally:
        print("Stopping servers...")
        backend.terminate()
        frontend.terminate()
        backend.wait()
        frontend.wait()

if __name__ == "__main__":
    asyncio.run(main())
