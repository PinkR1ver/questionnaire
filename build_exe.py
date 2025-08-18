#!/usr/bin/env python3
"""
构建exe文件的脚本
使用PyInstaller将server.py打包成独立的exe文件
"""

import os
import subprocess
import sys
from pathlib import Path

def build_exe():
    """构建exe文件"""
    print("开始打包项目...")
    
    # 当前目录
    current_dir = Path(__file__).parent
    
    # 需要包含的数据文件
    data_files = [
        "index.html",
        "styles.css", 
        "script.js",
        "questions.json"
    ]
    
    # 构建PyInstaller命令
    cmd = [
        "pyinstaller",
        "--onefile",  # 打包成单个exe文件
        "--name=questionnaire-server",  # exe文件名
        "--distpath=dist",  # 输出目录
        "--workpath=build",  # 构建临时目录
        "--specpath=.",  # spec文件位置
    ]
    
    # 添加数据文件
    for file in data_files:
        if os.path.exists(file):
            cmd.extend(["--add-data", f"{file};."])
            print(f"添加数据文件: {file}")
    
    # 添加主Python文件
    cmd.append("server.py")
    
    print("执行命令:", " ".join(cmd))
    
    try:
        # 执行打包命令
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print("打包成功!")
        print("输出文件位于: dist/questionnaire-server.exe")
        print("\n使用方法:")
        print("1. 运行 questionnaire-server.exe")
        print("2. 在浏览器中访问 http://localhost:8000")
        
    except subprocess.CalledProcessError as e:
        print(f"打包失败: {e}")
        print("错误输出:", e.stderr)
        sys.exit(1)

if __name__ == "__main__":
    build_exe()
