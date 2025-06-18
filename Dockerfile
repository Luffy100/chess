# 使用官方 Nginx 镜像作为基础镜像
FROM nginx:alpine
# 移除默认的 Nginx 首页
RUN rm -rf /usr/share/nginx/html/*

# 将本地 HTML 项目复制到 Nginx 的默认网页目录
COPY . /usr/share/nginx/html

# 可选：自定义 Nginx 配置（如需调整端口、缓存等）
# COPY nginx.conf /etc/nginx/conf.d/default.conf

