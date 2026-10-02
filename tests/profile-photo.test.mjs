import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { Blob as NodeBlob } from "node:buffer";
import { ReadableStream as NodeReadableStream } from "node:stream/web";
import { MAX_PHOTO_BYTES, inspectImage, validatePhotoUrl, downloadPhoto, preparePhoto, isSafePhoto } from "../src/core/profile-photo.js";
import { avatar } from "../src/components/avatar.js";

function pngHeader(width = 800, height = 600) {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

// Test doubles exercise browser boundaries; a browser is still needed for visual QA.
export async function runProfilePhotoTests() {
  const results = [];
  const check = async (name, run) => { await run(); results.push(name); };
  const keys = ["fetch", "document", "createImageBitmap", "localStorage", "Blob", "ReadableStream"];
  const originals = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const savedPhoto = "data:image/jpeg;base64,/9j/AAAA/9k=";
  try {
    globalThis.Blob ??= NodeBlob;
    globalThis.ReadableStream ??= NodeReadableStream;
    await check("rejects executable, credentialed, local and non-HTTPS URLs", () => {
      for (const url of ["javascript:alert(1)", "data:image/svg+xml,<svg/>", "file:///photo.png", "http://example.com/a.png", "https://user:pass@example.com/a", "https://127.0.0.1/a", "https://2130706433/a", "https://0x7f000001/a", "https://[::1]/a", "https://localhost./a", "https://server.local/a", "https://server.internal/a", "https://router.home.arpa/a", "https://example.com:8443/a", "https://example.com\\@localhost/a", "https://exam\nple.com/a"]) {
        assert.throws(() => validatePhotoUrl(url), undefined, url);
      }
      assert.equal(validatePhotoUrl("https://images.example.com/photo.png?q=1#fragment"), "https://images.example.com/photo.png?q=1");
    });

    await check("rejects spoofed files and excessive dimensions before decoding", async () => {
      assert.deepEqual(inspectImage(pngHeader()), { type: "image/png", width: 800, height: 600 });
      for (const bytes of [new TextEncoder().encode('<svg onload="alert(1)"/>'), new TextEncoder().encode("<html><script>alert(1)</script></html>"), pngHeader(8193, 1), pngHeader(5000, 5000), pngHeader(0, 100)]) {
        assert.throws(() => inspectImage(bytes));
      }
      let decoded = false;
      globalThis.createImageBitmap = async () => { decoded = true; throw Error("Should not decode"); };
      for (const blob of [new Blob(['<svg onload="alert(1)"/>'], { type: "image/png" }), new Blob([pngHeader()], { type: "image/jpeg" }), new Blob([pngHeader()], { type: "image/svg+xml" }), new Blob([new Uint8Array(MAX_PHOTO_BYTES + 1)], { type: "image/png" }), new Blob([])]) {
        await assert.rejects(preparePhoto(blob));
      }
      assert.equal(decoded, false);
    });

    await check("recognizes JPEG and WebP dimensions and rejects animated WebP", () => {
      const jpeg = Uint8Array.from([255,216,255,192,0,11,8,0,100,0,200,1,1,17,0,255,217]);
      assert.deepEqual(inspectImage(jpeg), { type: "image/jpeg", width: 200, height: 100 });
      for (const chunk of ["VP8X", "VP8 ", "VP8L"]) {
        const bytes = new Uint8Array(30);
        bytes.set(new TextEncoder().encode("RIFF"));
        bytes.set(new TextEncoder().encode("WEBP" + chunk), 8);
        const view = new DataView(bytes.buffer);
        if (chunk === "VP8X") { bytes[24] = 99; bytes[27] = 49; }
        if (chunk === "VP8 ") { bytes.set([157, 1, 42], 23); view.setUint16(26, 100, true); view.setUint16(28, 50, true); }
        if (chunk === "VP8L") { bytes[20] = 47; view.setUint32(21, 99 | (49 << 14), true); }
        assert.deepEqual(inspectImage(bytes), { type: "image/webp", width: 100, height: 50 });
        if (chunk === "VP8X") { bytes[20] = 2; assert.throws(() => inspectImage(bytes), /still image/); }
      }
    });

    await check("fetch omits credentials/referrer, rejects redirects and checks response type", async () => {
      let options;
      globalThis.fetch = async (url, opts) => { options = opts; return new Response(pngHeader(), { headers: { "content-type": "image/png" } }); };
      const blob = await downloadPhoto("https://images.example.com/p.png");
      assert.equal(blob.type, "image/png");
      assert.equal(options.credentials, "omit");
      assert.equal(options.referrerPolicy, "no-referrer");
      assert.equal(options.redirect, "error");
      assert.equal(options.mode, "cors");
      globalThis.fetch = async () => new Response("<script>alert(1)</script>", { headers: { "content-type": "text/html" } });
      await assert.rejects(downloadPhoto("https://images.example.com/p.png"), /valid JPEG/);
      globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
      await assert.rejects(downloadPhoto("https://images.example.com/p.png"), /upload the file instead/);
    });

    await check("download limits apply even with missing or false Content-Length", async () => {
      for (const declaredLength of [undefined, "1", String(MAX_PHOTO_BYTES + 1)]) {
        let cancelled = false;
        globalThis.fetch = async () => new Response(new ReadableStream({
          start(controller) { controller.enqueue(new Uint8Array(MAX_PHOTO_BYTES)); controller.enqueue(new Uint8Array(1)); },
          cancel() { cancelled = true; },
        }), { headers: { "content-type": "image/png", ...(declaredLength ? { "content-length": declaredLength } : {}) } });
        await assert.rejects(downloadPhoto("https://images.example.com/p.png"), /8 MB/);
        assert.equal(cancelled, true);
      }
    });

    await check("portrait, landscape and tiny images are cropped without stretching and re-encoded", async () => {
      for (const [width, height] of [[1600,900], [900,1600], [1,1]]) {
        let closed = false, drawing, output;
        globalThis.createImageBitmap = async () => ({ width, height, close() { closed = true; } });
        const canvas = { getContext: () => ({ fillRect() {}, drawImage(...args) { drawing = args.slice(1); } }), toDataURL(...args) { output = args; return savedPhoto; } };
        globalThis.document = { createElement: name => { assert.equal(name, "canvas"); return canvas; } };
        assert.equal(await preparePhoto(new Blob([pngHeader(width, height)], { type: "image/png" })), savedPhoto);
        const side = Math.min(width, height);
        assert.deepEqual(drawing, [(width-side)/2, (height-side)/2, side, side, 0, 0, 256, 256]);
        assert.deepEqual(output, ["image/jpeg", 0.85]);
        assert.equal(canvas.width, 256); assert.equal(canvas.height, 256); assert.equal(closed, true);
      }
    });

    await check("decode failures, cancellation and invalid encoder output cannot save photos", async () => {
      const blob = new Blob([pngHeader()], { type: "image/png" });
      globalThis.createImageBitmap = async () => { throw Error("Corrupt image"); };
      await assert.rejects(preparePhoto(blob), /valid JPEG/);
      const request = new AbortController(); request.abort();
      await assert.rejects(preparePhoto(blob, request.signal), { name: "AbortError" });
      let closed = false;
      globalThis.createImageBitmap = async () => ({ width: 800, height: 600, close() { closed = true; } });
      globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {} }), toDataURL: () => "data:image/svg+xml,<svg/>" }) };
      await assert.rejects(preparePhoto(blob), /Could not prepare/);
      assert.equal(closed, true);
    });

    await check("tampered photo data and names cannot inject HTML into avatar markup", () => {
      for (const photo of ['" onerror="alert(1)', "javascript:alert(1)", "https://example.com/a.jpg", "data:image/svg+xml;base64,PHN2Zz4=", savedPhoto + '" onerror="alert(1)', "data:image/jpeg;base64,/9j/" + "A".repeat(150000)]) {
        assert.equal(isSafePhoto(photo), false);
        const markup = avatar({ fullName: '"><script>alert(1)</script>', profilePhoto: photo });
        assert.ok(!markup.includes("<img")); assert.ok(!markup.includes("<script>"));
      }
      const markup = avatar({ fullName: "Amina Okafor", profilePhoto: savedPhoto });
      assert.ok(markup.includes('class="avatar-photo"')); assert.ok(markup.includes(">AO</span>"));
      assert.ok(!markup.includes("onerror="));
    });

    await check("storage failure leaves previous records unchanged", async () => {
      const values = new Map();
      let fail = false;
      globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem(key, value) { if (fail) throw Error("Quota exceeded"); values.set(key, value); } };
      const { MockStorage } = await import("../src/core/mock-storage.js");
      const storage = new MockStorage();
      const before = storage.data;
      fail = true;
      assert.throws(() => storage.write({ ...before, users: [] }, { requirePersistence: true }), /could not be saved/);
      assert.equal(storage.data, before);
      fail = false;
      storage.write({ ...before, users: before.users.map(user => ({ ...user, profilePhoto: savedPhoto })) }, { requirePersistence: true });
      assert.equal(new MockStorage().data.users[0].profilePhoto, savedPhoto);
    });

    await check("photo service restricts edits to the signed-in customer and supports removal", async () => {
      const { AuthService } = await import("../src/services/services.js");
      const { storage } = await import("../src/data/repositories.js");
      const before = storage.data;
      const values = new Map();
      globalThis.localStorage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
      let id = null;
      const auth = new AuthService({ getCurrentUserId: () => id });
      assert.throws(() => auth.updateProfilePhoto(savedPhoto), /Sign in/);
      id = "user-demo-admin";
      assert.throws(() => auth.updateProfilePhoto(savedPhoto), /Sign in/);
      id = "user-demo-customer";
      assert.throws(() => auth.updateProfilePhoto("javascript:alert(1)"), /valid profile photo/);
      auth.updateProfilePhoto(savedPhoto);
      assert.equal(auth.getCurrentUser().profilePhoto, savedPhoto);
      auth.updateProfilePhoto(null);
      assert.equal(auth.getCurrentUser().profilePhoto, null);
      storage.data = before;
    });

    await check("logout or navigation during processing prevents a late photo save", async () => {
      const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
      const handler = main.slice(main.indexOf("async function handlePhotoSubmit("), main.indexOf("// Broken or tampered"));
      for (const reason of ["logout", "navigation"]) {
        let finish, saved = false, id = "customer";
        const button = { textContent: "Save" };
        const form = { dataset: { form: "profile-photo-file" }, isConnected: true, querySelector: () => button, setAttribute() {}, removeAttribute() {} };
        const context = vm.createContext({
          photoRequest: null, AbortController,
          validateForm: () => true,
          auth: { getCurrentUser: () => id ? { id } : null, updateProfilePhoto: () => { saved = true; } },
          window: { setTimeout: () => 1, clearTimeout() {} },
          appRoot: { querySelectorAll: () => [] },
          formValues: () => ({ photo: new Blob([pngHeader()]) }),
          setFormError() {}, preparePhoto: () => new Promise(resolve => { finish = resolve; }),
        });
        vm.runInContext(handler, context);
        const pending = context.handlePhotoSubmit(form);
        if (reason === "logout") id = null;
        else { form.isConnected = false; context.photoRequest.abort(); }
        finish(savedPhoto);
        await pending;
        assert.equal(saved, false);
      }
    });
    return results;
  } finally {
    for (const key of keys) {
      const descriptor = originals.get(key);
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}
