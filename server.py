import http.server
import socketserver

# 设置端口号
PORT = 8000

# 创建请求处理器
Handler = http.server.SimpleHTTPRequestHandler

# 启动服务器
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"服务器运行在 http://localhost:{PORT}")
    print("按 Ctrl+C 停止服务器")
    httpd.serve_forever()