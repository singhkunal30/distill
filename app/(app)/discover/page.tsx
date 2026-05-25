import { PageHeader } from '@/components/shell/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export default function DiscoverPage() {
  return (
    <div>
      <PageHeader
        title="Discover"
        description="Cross-book ideas, recommendations, and your daily pick — landing in Phase 5."
        icon={Sparkles}
      />
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <Sparkles className="h-10 w-10 text-muted-foreground" />
          <p className="font-serif text-lg">Coming in Phase 5.</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Once embeddings come online, Distill will surface related ideas across your
            library, your daily “For You Today” pick, and concept clusters between books.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
