import http.server
import socketserver
import sys
import time
import traceback

def run_server():
    # 设置端口号
    PORT = 8000

    try:
        # 创建请求处理器
        Handler = http.server.SimpleHTTPRequestHandler

        # 尝试启动服务器
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print(f"服务器运行在 http://localhost:{PORT}")
            print("按 Ctrl+C 停止服务器")
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 98 or e.errno == 10048:  # Linux/Windows 端口被占用的错误码
            print(f"错误：端口 {PORT} 已被占用")
            print("请确保没有其他程序正在使用此端口，或者尝试关闭相关程序后重试")
        else:
            print(f"启动服务器时发生错误：{str(e)}")
            print("详细错误信息：")
            traceback.print_exc()
    except KeyboardInterrupt:
        print("\n服务器已停止")
    except Exception as e:
        print(f"发生未知错误：{str(e)}")
        print("详细错误信息：")
        traceback.print_exc()

if __name__ == "__main__":
    try:
        run_server()
    except Exception as e:
        print("\n程序发生严重错误：")
        print(str(e))
        print("\n详细错误信息：")
        traceback.print_exc()
        print("\n按回车键退出...")
        input()  # 等待用户按回车，这样错误信息不会立即消失
        sys.exit(1)