import { z } from "zod/v4";

import { parseAdminPublishedAtInput } from "./videoDateUtils";
import {
  isValidVideoFilterKey,
  normalizeVideoFilterKeyInput,
  VIDEO_FILTER_KEY_MAX_LENGTH,
} from "./videoFilterKeyUtils";
import { VIDEO_STATUS_OPTIONS } from "./videoTypes";

const optionalNonNegativeInteger = (label: string) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }

      return value;
    },
    z.coerce
      .number()
      .int(`${label} phải là số nguyên`)
      .min(0, `${label} không được âm`)
      .optional(),
  );

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const optionalVideoFilterKey = z
  .string()
  .max(VIDEO_FILTER_KEY_MAX_LENGTH, "Key lọc tối đa 64 ký tự")
  .refine(
    (value) => normalizeVideoFilterKeyInput(value) !== "all",
    "Không sử dụng all làm key lọc",
  )
  .refine(
    (value) => isValidVideoFilterKey(value),
    "Key lọc chỉ được gồm chữ thường, số và dấu gạch dưới",
  )
  .optional()
  .or(z.literal(""));

export const createVideoSchema = z
  .object({
    mode: z.enum(["local-upload", "manual", "embed"]),
    title: z
      .string()
      .trim()
      .min(1, "Tiêu đề không được bỏ trống")
      .max(200, "Tiêu đề tối đa 200 ký tự"),
    description: z
      .string()
      .max(5000, "Mô tả tối đa 5000 ký tự")
      .optional()
      .or(z.literal("")),
    filterKey: optionalVideoFilterKey,
    playbackUrl: z.string().optional().or(z.literal("")),
    embedCodeOrUrl: z
      .string()
      .max(5000, "Embed code tối đa 5000 ký tự")
      .optional()
      .or(z.literal("")),
    thumbnailUrl: z.string().optional().or(z.literal("")),
    durationSeconds: optionalNonNegativeInteger("Thời lượng"),
    viewCount: optionalNonNegativeInteger("Lượt xem"),
    publishedAt: z.string().optional().or(z.literal("")),
    status: z.enum(VIDEO_STATUS_OPTIONS),
    file: z.instanceof(FileList).optional(),
  })
  .superRefine((value, context) => {
    if (value.mode === "manual") {
      if (!value.playbackUrl || value.playbackUrl.trim() === "") {
        context.addIssue({
          code: "custom",
          path: ["playbackUrl"],
          message: "URL phát video không được bỏ trống",
        });
      } else {
        if (!isHttpUrl(value.playbackUrl.trim())) {
          context.addIssue({
            code: "custom",
            path: ["playbackUrl"],
            message: "URL phát video không hợp lệ",
          });
        }
      }

      if (value.thumbnailUrl && value.thumbnailUrl.trim() !== "") {
        if (!isHttpUrl(value.thumbnailUrl.trim())) {
          context.addIssue({
            code: "custom",
            path: ["thumbnailUrl"],
            message: "URL thumbnail không hợp lệ",
          });
        }
      }
    }

    if (value.mode === "embed") {
      if (!value.embedCodeOrUrl || value.embedCodeOrUrl.trim() === "") {
        context.addIssue({
          code: "custom",
          path: ["embedCodeOrUrl"],
          message: "Embed code hoặc URL không được bỏ trống",
        });
      }

      if (value.thumbnailUrl && value.thumbnailUrl.trim() !== "") {
        if (!isHttpUrl(value.thumbnailUrl.trim())) {
          context.addIssue({
            code: "custom",
            path: ["thumbnailUrl"],
            message: "URL thumbnail không hợp lệ",
          });
        }
      }
    }

    if (value.mode === "local-upload") {
      if (value.thumbnailUrl && value.thumbnailUrl.trim() !== "") {
        if (!isHttpUrl(value.thumbnailUrl.trim())) {
          context.addIssue({
            code: "custom",
            path: ["thumbnailUrl"],
            message: "URL thumbnail không hợp lệ",
          });
        }
      }
    }

    if (value.mode === "local-upload") {
      const file = value.file?.item(0);

      if (!file) {
        context.addIssue({
          code: "custom",
          path: ["file"],
          message: "Vui lòng chọn file video",
        });
      } else if (!file.type.startsWith("video/")) {
        context.addIssue({
          code: "custom",
          path: ["file"],
          message: "File tải lên phải là video",
        });
      }
    }

    if (
      value.publishedAt?.trim() &&
      !parseAdminPublishedAtInput(value.publishedAt)
    ) {
      context.addIssue({
        code: "custom",
        path: ["publishedAt"],
        message:
          "Thời gian xuất bản phải có dạng 17/03/1999 hoặc 17/03/1999, 10:41. Có thể nhập nhanh 17031999, 1041.",
      });
    }
  });

export type CreateVideoFormValues = z.infer<typeof createVideoSchema>;

export const editVideoSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Tiêu đề không được bỏ trống")
      .max(200, "Tiêu đề tối đa 200 ký tự"),
    description: z
      .string()
      .max(5000, "Mô tả tối đa 5000 ký tự")
      .optional()
      .or(z.literal("")),
    filterKey: optionalVideoFilterKey,
    playbackUrl: z.string().optional().or(z.literal("")),
    thumbnailUrl: z.string().optional().or(z.literal("")),
    durationSeconds: optionalNonNegativeInteger("Thời lượng"),
    viewCount: optionalNonNegativeInteger("Lượt xem"),
    publishedAt: z.string().optional().or(z.literal("")),
    status: z.enum(VIDEO_STATUS_OPTIONS),
  })
  .superRefine((value, context) => {
    if (value.playbackUrl && value.playbackUrl.trim() !== "") {
      const result = z.url().safeParse(value.playbackUrl.trim());
      if (!result.success) {
        context.addIssue({
          code: "custom",
          path: ["playbackUrl"],
          message: "URL phát video không hợp lệ",
        });
      }
    }

    if (value.thumbnailUrl && value.thumbnailUrl.trim() !== "") {
      const result = z.url().safeParse(value.thumbnailUrl.trim());
      if (!result.success) {
        context.addIssue({
          code: "custom",
          path: ["thumbnailUrl"],
          message: "URL thumbnail không hợp lệ",
        });
      }
    }

    if (
      value.publishedAt &&
      Number.isNaN(new Date(value.publishedAt).getTime())
    ) {
      context.addIssue({
        code: "custom",
        path: ["publishedAt"],
        message: "Thời gian xuất bản không hợp lệ",
      });
    }
  });

export type EditVideoFormValues = z.infer<typeof editVideoSchema>;
