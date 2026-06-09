#!/bin/bash

# ClawMigrate v2.0 部署脚本
# 请在您的电脑上执行此脚本

echo "🚀 ClawMigrate v2.0 部署脚本"
echo "=============================="
echo ""

cd "$(dirname "$0")"

echo "📂 当前目录: $(pwd)"
echo ""

echo "📤 正在推送到 GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 推送成功！"
    echo ""
    echo "🎉 您的部署平台会自动检测更新并重新部署！"
    echo ""
    echo "📦 更新内容："
    echo "   - ✅ 图形验证码"
    echo "   - ✅ 邮箱验证注册"
    echo "   - ✅ 完整管理后台（数据仪表盘、用户管理）"
    echo "   - ✅ 用户个人设置"
    echo "   - ✅ 用户行为追踪"
    echo "   - ✅ 数据统计（UV/PV、趋势图）"
else
    echo ""
    echo "❌ 推送失败，请检查："
    echo "   1. 是否已登录 GitHub"
    echo "   2. 是否有推送权限"
    echo "   3. 网络连接是否正常"
fi

echo ""
echo "=============================="
