# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: produto-avaliacoes.spec.ts >> 32.2 produto demo mostra quatro paginas de avaliacoes reais
- Location: e2e\produto-avaliacoes.spec.ts:3:1

# Error details

```
Error: browserContext.newPage: Executable doesn't exist at C:\Users\Pedro\AppData\Local\ms-playwright\ffmpeg-1013\ffmpeg-win64.exe
╔═════════════════════════════════════════════════════════════════╗
║ Video rendering requires ffmpeg binary.                         ║
║ Downloading it will not affect any of the system-wide settings. ║
║ Please run the following command:                               ║
║                                                                 ║
║     npx playwright install ffmpeg                               ║
║                                                                 ║
║ <3 Playwright Team                                              ║
╚═════════════════════════════════════════════════════════════════╝
```