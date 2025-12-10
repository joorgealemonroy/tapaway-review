import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSalesRep } from '@/hooks/useSalesRep';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, ArrowLeft, Zap, Phone, Mail, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface RepRestaurant {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  status: string;
  plan_type: string | null;
  closed_at: string | null;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  not_contacted: 'Not Contacted',
  contacted: 'Contacted',
  closed: 'Closed',
  lost: 'Lost',
};

const statusColors: Record<string, string> = {
  not_contacted: 'bg-gray-100 text-gray-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
};

const RepRestaurants = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { salesRep, loading: repLoading, isSalesRep } = useSalesRep();
  const [restaurants, setRestaurants] = useState<RepRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState<string | null>(null);
  
  // Form state
  const [newRestaurant, setNewRestaurant] = useState({
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    notes: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (!repLoading && !isSalesRep) {
      navigate('/');
      return;
    }
  }, [authLoading, repLoading, user, isSalesRep, navigate]);

  useEffect(() => {
    const fetchRestaurants = async () => {
      if (!salesRep) return;

      try {
        let query = supabase
          .from('rep_restaurants')
          .select('*')
          .eq('sales_rep_id', salesRep.id)
          .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }

        const { data, error } = await query;

        if (error) throw error;
        setRestaurants(data || []);
      } catch (error) {
        console.error('Error fetching restaurants:', error);
        toast.error('Failed to load restaurants');
      } finally {
        setLoading(false);
      }
    };

    if (salesRep) {
      fetchRestaurants();
    }
  }, [salesRep, statusFilter]);

  const handleAddRestaurant = async () => {
    if (!salesRep || !newRestaurant.name.trim()) {
      toast.error('Restaurant name is required');
      return;
    }

    try {
      const { error } = await supabase.from('rep_restaurants').insert({
        sales_rep_id: salesRep.id,
        name: newRestaurant.name.trim(),
        contact_name: newRestaurant.contact_name.trim() || null,
        phone: newRestaurant.phone.trim() || null,
        email: newRestaurant.email.trim() || null,
        notes: newRestaurant.notes.trim() || null,
        status: 'not_contacted',
      });

      if (error) throw error;

      toast.success('Restaurant added!');
      setAddDialogOpen(false);
      setNewRestaurant({ name: '', contact_name: '', phone: '', email: '', notes: '' });
      
      // Refresh list
      const { data } = await supabase
        .from('rep_restaurants')
        .select('*')
        .eq('sales_rep_id', salesRep.id)
        .order('created_at', { ascending: false });
      setRestaurants(data || []);
    } catch (error) {
      console.error('Error adding restaurant:', error);
      toast.error('Failed to add restaurant');
    }
  };

  const handleStatusChange = async (restaurantId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'closed') {
        updates.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('rep_restaurants')
        .update(updates)
        .eq('id', restaurantId);

      if (error) throw error;

      setRestaurants(prev => 
        prev.map(r => r.id === restaurantId ? { ...r, ...updates } : r)
      );
      toast.success('Status updated');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  if (authLoading || repLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/rep')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">My Restaurants</h1>
              <p className="text-sm text-muted-foreground">{restaurants.length} total</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="not_contacted">Not Contacted</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Restaurant
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Restaurant</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="name">Restaurant Name *</Label>
                    <Input
                      id="name"
                      value={newRestaurant.name}
                      onChange={(e) => setNewRestaurant(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Joe's Pizza"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact">Contact Name</Label>
                    <Input
                      id="contact"
                      value={newRestaurant.contact_name}
                      onChange={(e) => setNewRestaurant(prev => ({ ...prev, contact_name: e.target.value }))}
                      placeholder="Owner/Manager name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newRestaurant.phone}
                        onChange={(e) => setNewRestaurant(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="(555) 555-5555"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newRestaurant.email}
                        onChange={(e) => setNewRestaurant(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="owner@restaurant.com"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={newRestaurant.notes}
                      onChange={(e) => setNewRestaurant(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any notes about this restaurant..."
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleAddRestaurant} className="w-full">
                    Add Restaurant
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="default" onClick={() => navigate('/rep/close')}>
              <Zap className="mr-2 h-4 w-4" />
              Close Now
            </Button>
          </div>
        </div>

        {/* Restaurant List */}
        {restaurants.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No restaurants yet. Start adding prospects!</p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Restaurant
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {restaurants.map((restaurant) => (
              <Card key={restaurant.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold">{restaurant.name}</h3>
                        <Badge className={statusColors[restaurant.status]}>
                          {statusLabels[restaurant.status]}
                        </Badge>
                        {restaurant.plan_type && (
                          <Badge variant="outline">{restaurant.plan_type}</Badge>
                        )}
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        {restaurant.contact_name && (
                          <span>{restaurant.contact_name}</span>
                        )}
                        {restaurant.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {restaurant.phone}
                          </span>
                        )}
                        {restaurant.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {restaurant.email}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select 
                        value={restaurant.status} 
                        onValueChange={(value) => handleStatusChange(restaurant.id, value)}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_contacted">Not Contacted</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>

                      {restaurant.status !== 'closed' && restaurant.status !== 'lost' && (
                        <Button 
                          size="sm"
                          onClick={() => navigate(`/rep/close?restaurant=${restaurant.id}`)}
                        >
                          <Zap className="h-4 w-4" />
                        </Button>
                      )}

                      {restaurant.notes && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => setDetailsOpen(detailsOpen === restaurant.id ? null : restaurant.id)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {detailsOpen === restaurant.id && restaurant.notes && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-muted-foreground">{restaurant.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default RepRestaurants;
