import subprocess
import os
import sys
import platform

def run(cmd, cwd=None, ignore_error=False):
    print(f"$ {cmd} ({cwd or os.getcwd()})")
    try:
        subprocess.check_call(cmd, cwd=cwd, shell=True)
    except subprocess.CalledProcessError as e:
        print(f"! Failed: {e}")
        if not ignore_error:
            sys.exit(1)

def exists(path):
    return os.path.exists(path)

def main():
    root = os.getcwd()
    server = os.path.join(root, "server")
    web = os.path.join(root, "web")

    print("=== Build frontend & backend ===")
    if exists(os.path.join(web, "package.json")):
        run("npm ci || npm install", cwd=web, ignore_error=True)
        run("npm run build", cwd=web)
    if exists(os.path.join(server, "package.json")):
        run("npm ci || npm install", cwd=server, ignore_error=True)
        run("npm run build", cwd=server)

    print("=== Deploy targets (best-effort) ===")
    # Vercel (frontend)
    if exists(os.path.join(root, "vercel.json")) or exists(os.path.join(web, "vercel.json")):
        # Try local vercel CLI
        run("npx vercel --version", ignore_error=True)
        run(f"npx vercel --prod {'%s' % web if exists(os.path.join(web,'vercel.json')) or exists(os.path.join(web,'package.json')) else '.'}", cwd=root, ignore_error=True)

    # Firebase Hosting/Functions
    if exists(os.path.join(root, "firebase.json")):
        run("npx firebase --version", ignore_error=True)
        run("npx firebase deploy", cwd=root, ignore_error=True)

    # Convex
    convex_dir = os.path.join(root, "convex")
    if exists(convex_dir):
        run("npx convex --version", ignore_error=True)
        run("npx convex deploy", cwd=root, ignore_error=True)

    # Render (if using render.yaml)
    if exists(os.path.join(root, "render.yaml")):
        print("render.yaml detected. Ensure deployment is configured in Render dashboard.")

    print("=== Done. If any step failed, check output above. ===")

if __name__ == "__main__":
    main()
