import http.server
import socketserver
import sys
import time
import traceback
import json
import os
import glob
import socket
import threading

class RequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/api/questionnaires'):
            try:
                patterns = [
                    os.path.join(os.getcwd(), 'question_*.json'),
                    os.path.join(os.getcwd(), 'questions_*.json'),
                ]
                file_set = set()
                for pattern in patterns:
                    for f in glob.glob(pattern):
                        file_set.add(f)
                files = sorted(file_set)
                result = []
                for f in files:
                    title = None
                    try:
                        with open(f, 'r', encoding='utf-8') as fp:
                            data = json.load(fp)
                            title = data.get('title')
                    except Exception:
                        pass
                    result.append({"file": os.path.basename(f), "title": title})

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}, ensure_ascii=False).encode('utf-8'))
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/save_questionnaire'):
            try:
                length = int(self.headers.get('Content-Length', '0'))
                raw = self.rfile.read(length or 0)
                data = json.loads(raw.decode('utf-8')) if raw else {}
                file_name = (data.get('file') or '').strip()
                content = data.get('content')

                # 校验文件名：以 question_ 开头，.json 结尾，不允许路径分隔符
                if not file_name.startswith('question_') or not file_name.endswith('.json'):
                    raise ValueError('文件名需以 question_ 开头且以 .json 结尾')
                if '/' in file_name or '\\' in file_name:
                    raise ValueError('文件名不能包含路径分隔符')
                if not isinstance(content, (dict, list)):
                    raise ValueError('content 必须是 JSON 对象或数组')

                target = os.path.join(os.getcwd(), file_name)
                with open(target, 'w', encoding='utf-8') as fp:
                    json.dump(content, fp, ensure_ascii=False, indent=4)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True, "file": file_name}, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False).encode('utf-8'))
        else:
            super().do_POST()

class BuilderHandler(http.server.SimpleHTTPRequestHandler):
    pass


def run_server():
    # 设置端口号
    PORT = 8000
    BUILDER_PORT = 8001

    def get_local_ip():
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            # 不需要真的连通，系统会为该目的地址选择一个合适的本机IP
            s.connect(('8.8.8.8', 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            try:
                return socket.gethostbyname(socket.gethostname())
            except Exception:
                return '127.0.0.1'

    try:
        # 创建请求处理器
        Handler = RequestHandler

        # 尝试启动主服务器
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            local_ip = get_local_ip()
            print(f"服务器运行在 http://localhost:{PORT}")
            print(f"同局域网访问： http://{local_ip}:{PORT}")
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