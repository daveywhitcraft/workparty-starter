// app/submit/page.tsx
export default function SubmitPage() {
  return (
    <main className="px-6 pt-28 pb-20">
      <h1 className="text-3xl font-semibold mb-8">Submit your video</h1>

      {/* stacked form */}
      <form
        className="max-w-2xl space-y-5"
        action="/api/submit"
        method="post"
        encType="multipart/form-data"
      >
        <div>
          <label htmlFor="title" className="block mb-1">Title *</label>
          <input
            id="title"
            name="title"
            required
            className="w-full rounded border border-white/20 bg-black/30 px-3 py-2"
            placeholder="Title"
          />
        </div>

        <div>
          <label htmlFor="artist_name" className="block mb-1">Artist name *</label>
          <input
            id="artist_name"
            name="artist_name"
            required
            className="w-full rounded border border-white/20 bg-black/30 px-3 py-2"
            placeholder="Your name"
          />
        </div>

        <div>
          <label htmlFor="city" className="block mb-1">City *</label>
          <input
            id="city"
            name="city"
            required
            className="w-full rounded border border-white/20 bg-black/30 px-3 py-2"
            placeholder="City"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="year" className="block mb-1">Year *</label>
            <input
              id="year"
              name="year"
              type="number"
              required
              className="w-full rounded border border-white/20 bg-black/30 px-3 py-2"
              placeholder="2025"
            />
          </div>
          <div>
            <label htmlFor="runtime" className="block mb-1">Runtime (min) *</label>
            <input
              id="runtime"
              name="runtime"
              type="number"
              required
              className="w-full rounded border border-white/20 bg-black/30 px-3 py-2"
              placeholder="12"
            />
          </div>
        </div>

        <div>
          <label htmlFor="file" className="block mb-1">
            Video file (MP4, max 3 GB) *
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept="video/mp4"
            required
            className="w-full rounded border border-white/20 bg-black/30 px-3 py-2"
          />
        </div>

        <button
          type="submit"
          className="rounded border border-white/30 px-4 py-2 hover:bg-white/10"
        >
          Submit
        </button>
      </form>
    </main>
  );
}
