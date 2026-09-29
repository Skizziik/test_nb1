"""Export the procedural hero to assets/hero.glb using headless Chromium.

    npm install && npm run build && python3 tools/hero_export/export.py
"""
import asyncio, base64, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]

async def main():
    bundle = (ROOT / "tools/hero_export/bundle.js").read_text()
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await b.new_page()
        await page.set_content("<html><body></body></html>")
        await page.add_script_tag(content=bundle)
        data = await page.evaluate("HeroExport.exportGLB()")
        await b.close()
    out = ROOT / "assets/hero.glb"
    out.parent.mkdir(exist_ok=True)
    out.write_bytes(base64.b64decode(data))
    print(f"wrote {out} ({out.stat().st_size // 1024} KB)")

asyncio.run(main())
