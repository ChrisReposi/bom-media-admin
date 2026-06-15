# Video Share CMS / BOM Media — Admin Web Codex Pack

Bộ tài liệu này dùng cho repo/folder **Admin Web** đã tách riêng khỏi backend API và các static public websites.

Mục tiêu chính:

- Giúp Codex hiểu đúng bối cảnh dự án mỗi lần mở prompt mới.
- Giữ Admin Web là **trang quản trị duy nhất**.
- Ngăn việc thêm nhầm logic admin/API private vào public static websites.
- Chuẩn hóa kế hoạch production, security, database, deploy và session handoff.

## Cách dùng

Copy toàn bộ các file/thư mục trong ZIP này vào root của repo/folder Admin Web, ví dụ:

```txt
admin-web/
  AGENTS.md
  PLAN.md
  session-log.md
  docs/
```

Mỗi lần mở Codex, prompt nên bắt đầu bằng:

```txt
Hãy đọc AGENTS.md, PLAN.md, session-log.md và docs/* trước khi sửa code.
Chỉ sửa đúng scope mình yêu cầu. Sau khi sửa, cập nhật session-log.md.
```

## Tài liệu trong gói

```txt
AGENTS.md
PLAN.md
session-log.md
docs/
  00_PROJECT_BRIEF.md
  01_ARCHITECTURE.md
  02_ADMIN_WEB_RULES.md
  03_SECURITY_MODEL.md
  04_DATABASE_RISK_REGISTER.md
  05_DEPLOYMENT_HOSTINGER_CLOUDFLARE.md
  06_API_CONTRACTS.md
  07_PRODUCTION_CHECKLIST.md
  08_CODEX_WORKFLOW.md
  09_DECISIONS.md
  10_BACKLOG.md
  11_INCIDENT_RESPONSE.md
  12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md
```

## Ghi chú quan trọng

Dự án hiện có 3 phần tách rời:

1. **Backend API**: NestJS + Prisma + MySQL/MariaDB, global prefix `/api/v1`.
2. **Admin Web**: React + Vite + TypeScript static dashboard.
3. **Public Website**: Vanilla JS static sites chỉ hiển thị giao diện và video qua share link/token.

Public website **không được** chứa admin mini page, admin login, create video, create share link hoặc hardcode API origin.

## Production smoke test

Before an Admin Web release, run the manual workflow in:

```txt
docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md
```

The checklist covers build output, public Vite env, auth/logout/refresh behavior, protected routes, key feature screens, Cloudflare checks, Swagger exposure, and public mini-admin absence checks.
