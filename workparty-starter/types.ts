export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'archived';
export interface Submission {
  id: string;
  created_at: string;
  artist_name: string;
  email: string;
  city: string;
  title: string;
  year: string | null;
  runtime: string | null;
  aspect_ratio: string | null;
  resolution: string | null;
  synopsis: string | null;
  credits: string | null;
  file_path: string;
  consent_archive: boolean;
  status: SubmissionStatus;
  order_index: number | null;
}
