import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProjectById, PvProject } from '../lib/supabase';
import Header from '../components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, MapPin, Zap, Calendar, Building2, Phone, Mail, Power, Home, Info, Activity } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../components/ui/chart';
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Skeleton } from '../components/ui/skeleton';

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<PvProject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    const fetchProject = async () => {
      setLoading(true);
      try {
        const data = await getProjectById(id);
        if (!data) {
          navigate('/');
          return;
        }
        setProject(data);
      } catch (error) {
        console.error('Error loading project:', error);
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

  if (!project) {
    return null;
  }

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

  const formatCapacity = (kwp: number) => {
    return `${kwp.toLocaleString()} kWp`;
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

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl mb-2">{project.name}</CardTitle>
                <CardDescription className="text-base">
                  <div className="flex items-center gap-2 mt-2">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {project.lat.toFixed(4)}°N, {project.lon.toFixed(4)}°E
                    </span>
                  </div>
                </CardDescription>
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
                  <Power className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Capacity</p>
                  <p className="text-lg font-semibold">{formatCapacity(project.capacity_kwp)}</p>
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

              {project.eeg_bucket && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">EEG Category</p>
                    <p className="text-lg font-semibold capitalize">
                      {project.eeg_bucket === 'eeg_awarded' ? 'EEG Awarded' : 'Merchant Likely'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {(project.address_line1 || project.city || project.postal_code || project.country) && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Home className="h-5 w-5 text-primary" />
                <CardTitle>Address</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm leading-6">
                {project.address_line1 && <div>{project.address_line1}</div>}
                {project.address_line2 && <div>{project.address_line2}</div>}
                {(project.postal_code || project.city) && (
                  <div>
                    {project.postal_code ? `${project.postal_code} ` : ''}
                    {project.city || ''}
                  </div>
                )}
                {(project.state || project.country) && (
                  <div>
                    {project.state ? `${project.state} ` : ''}
                    {project.country || ''}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {(project.eeg_bucket || project.eeg_award_id || project.eeg_auction_round || project.eeg_reference_price_ct_per_kwh) && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                <CardTitle>EEG Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {project.eeg_bucket && (
                  <div>
                    <div className="text-muted-foreground">Category</div>
                    <div className="font-medium capitalize">{project.eeg_bucket === 'eeg_awarded' ? 'EEG Awarded' : 'Merchant Likely'}</div>
                  </div>
                )}
                {project.eeg_award_id && (
                  <div>
                    <div className="text-muted-foreground">Award ID</div>
                    <div className="font-medium">{project.eeg_award_id}</div>
                  </div>
                )}
                {project.eeg_auction_round && (
                  <div>
                    <div className="text-muted-foreground">Auction Round</div>
                    <div className="font-medium">{project.eeg_auction_round}</div>
                  </div>
                )}
                {typeof project.eeg_reference_price_ct_per_kwh === 'number' && (
                  <div>
                    <div className="text-muted-foreground">Reference Price</div>
                    <div className="font-medium">{project.eeg_reference_price_ct_per_kwh.toFixed(2)} ct/kWh</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mock: Production Profile */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle>Production Profile (Typical Day)</CardTitle>
              <CardDescription>Illustrative curve showing average solar output over a day</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ production: { label: 'Power (kW)', color: 'hsl(var(--primary))' } }}
              className="w-full h-[260px]"
            >
              <LineChart data={
                Array.from({ length: 24 }, (_, h) => ({
                  hour: `${h}:00`,
                  production: Math.max(0, Math.round(1000 * Math.sin(((h - 6) / 12) * Math.PI)))
                }))
              }>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} interval={2} />
                <YAxis tick={{ fontSize: 12 }} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="production" stroke="var(--color-production)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Mock: Grid Node Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Grid Node Information</CardTitle>
            <CardDescription>Static example values for illustration</CardDescription>
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
            <CardDescription>Static example values for exploration</CardDescription>
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
              <div className="text-sm">
                <div className="text-muted-foreground">Colocation Contact</div>
                <div className="font-medium">energy-partnerships@example.com</div>
              </div>
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

        {(project.contact_email || project.contact_phone) && (
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {project.contact_email && (
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <a
                        href={`mailto:${project.contact_email}`}
                        className="text-lg font-semibold hover:underline"
                      >
                        {project.contact_email}
                      </a>
                    </div>
                  </div>
                )}

                {project.contact_phone && (
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <a
                        href={`tel:${project.contact_phone}`}
                        className="text-lg font-semibold hover:underline"
                      >
                        {project.contact_phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProjectDetail;
