import React from 'react';
import { FileText, Plus, Download, Upload, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function LoggingPanel() {
  return (
    <div className="space-y-6">
      {/* Logging Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            QSO Logging
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Log and manage your QSO contacts and contest entries
          </div>
        </CardContent>
      </Card>

      {/* QSO Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">QSO Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <div className="text-lg font-medium text-muted-foreground mb-2">
              QSO Logging Coming Soon
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              This feature will provide comprehensive QSO logging capabilities
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" disabled>
                <Plus className="h-4 w-4 mr-2" />
                New QSO
              </Button>
              <Button variant="outline" disabled>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button variant="outline" disabled>
                <Download className="h-4 w-4 mr-2" />
                Export ADIF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
