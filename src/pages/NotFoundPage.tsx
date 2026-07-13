import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-(--admin-app-bg) px-6 py-10 text-(--admin-text-strong)">
      <section className="w-full max-w-md rounded-xl border border-(--admin-border) bg-(--admin-surface) p-8 text-center shadow-(--admin-shadow)">
        <p className="text-sm font-semibold uppercase tracking-wide text-(--admin-text-muted)">
          404
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-(--admin-text-strong)">
          Không tìm thấy trang
        </h1>
        <p className="mt-3 text-sm leading-6 text-(--admin-text)">
          Trang bạn đang mở không tồn tại, đã được di chuyển hoặc bạn không có
          đường dẫn hợp lệ.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" />
            Quay lại
          </Button>
          <Button asChild>
            <Link to="/">
              <LayoutDashboard className="size-4" />
              Về Dashboard
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
