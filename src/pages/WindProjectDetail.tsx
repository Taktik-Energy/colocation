import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWindProjectById, WindProject } from '../lib/supabase';
import Header from '../components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, MapPin, Calendar, Building2, Zap } from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';

const WindProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<WindProject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    const fetchProject = async () => {
      setLoading(true);
      try {
        const data = await getWindProjectById(id);
        if (!data) {
          navigate('/');
          return;
        }
        setProject(data);
      } catch (error) {
        console.error('Error loading wind project:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Map
          </Button>
          <div className="space-y-6">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatPowerKWandMW = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') return '—';
    const n = Number(value);
    if (Number.isNaN(n)) return '—';
    const mw = n / 1000;
    return `${n.toLocaleString()} kW (${mw.toFixed(mw >= 10 ? 0 : 2)} MW)`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operating':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'connected':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'planned':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Map
        </Button>

        <h1 className="text-3xl md:text-4xl font-bold mb-4">{project.name || 'Wind project'}</h1>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">Overview</CardTitle>
                <div className="text-muted-foreground text-base">
                  <div className="text-foreground">
                    <span className="font-medium">Project name:</span> {project.name || '—'}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {project.lat.toFixed(4)}°N, {project.lon.toFixed(4)}°E
                    </span>
                  </div>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(project.status)}`}>
                {project.status}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Capacity</p>
                  <p className="text-lg font-semibold">{formatPowerKWandMW(project.capacity_kw)}</p>
                </div>
              </div>

              {project.completion_date && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Commissioning Date</p>
                    <p className="text-lg font-semibold">{formatDate(project.completion_date)}</p>
                  </div>
                </div>
              )}

              {!project.completion_date && project.planned_date && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Planned Commissioning</p>
                    <p className="text-lg font-semibold">{formatDate(project.planned_date)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {(project.operator_name || project.grid_operator_name) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Operator Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {project.operator_name && (
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Operator</p>
                      <p className="text-lg font-semibold">{project.operator_name}</p>
                    </div>
                  </div>
                )}

                {project.grid_operator_name && (
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Grid Operator</p>
                      <p className="text-lg font-semibold">{project.grid_operator_name}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mock: Grid Node Info */}
        <Card className="mb-6 mt-6">
          <CardHeader>
            <CardTitle>Grid Node Information</CardTitle>
            <CardDescription>Preview, comming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-muted-foreground">Max Node Capacity</div>
                <div className="text-lg font-semibold">120 MW</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Used Capacity</div>
                <div className="text-lg font-semibold">86 MW</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Downstream Capacity Available</div>
                <div className="text-lg font-semibold">Yes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mock: Colocation Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Colocation Information</CardTitle>
            <CardDescription>Preview, coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground">Open to Colocate</div>
                  <div className="text-lg font-semibold">Yes</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Preferred Structure</div>
                  <div className="text-lg font-semibold">Joint Venture or Fixed Compensation</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WindProjectDetail;


