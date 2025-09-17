// app/api/signed-upload/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ---- Adjust these as you like ----
const MAX_SIZE_BYTES = 3 * 1024 * 1024 * 1024; // 3 GB
const ALLOWED_MIME = new Set(["video/mp4"]);   // MP4 only
const DEFAULT_BUCKET = "videos";               // use your bucket name

function safeName(name: string) {
  // strip path chars and squash spaces
  return name.replace(/[^\w.\-()+\[\]{}@~]/g, "_");
}

export async function POST(req: Request) {
  try {
    const { filename, contentType, size } = (await req.json()) as {
      filename?: string;
      contentType?: string;
      size?: number;
    };

    if (!filename || !contentType || typeof size !== "number") {
      return NextResponse.json(
        { error: "Missing filename, contentType, or size" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME.has(contentType)) {
      return NextResponse.json(
        { error: "Only MP4 files are accepted" },
        { status: 400 }
      );
    }

    if (size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Max ${Math.round(MAX_SIZE_BYTES / (1024 * 1024))} MB.` },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const srv = process.env.SUPABASE_SERVICE_ROLE || "";
    if (!url || !srv) {
      return NextResponse.json(
        { error: "Server misconfigured (Supabase env missing)" },
        { status: 500 }
      );
    }

    const supabase = createClient(url, srv, { auth: { persistSession: false } });

    // Build a unique storage path
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const rnd = crypto.randomUUID();
    const path = `${today}/${rnd}-${safeName(filename)}`;

    // Create a signed upload URL for direct-from-browser upload
    const { data, error } = await supabase.storage
      .from(DEFAULT_BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: error?.message || "Failed to create signed upload URL" },
        { status: 500 }
      );
    }

    // Return the PUT/POSTable URL. Your current client uses `fetch(uploadUrl, { method: 'PUT', ... })`.
    // If you ever switch to supabase-js on the client, you can use:
    //   supabase.storage.from(bucket).uploadToSignedUrl(path, file, { token: data.token, contentType })
    return NextResponse.json({
      uploadUrl: data.signedUrl,
      token: data.token,     // provided in case you switch to uploadToSignedUrl later
      path,                  // saved later by /api/confirm-upload
      bucket: DEFAULT_BUCKET
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
