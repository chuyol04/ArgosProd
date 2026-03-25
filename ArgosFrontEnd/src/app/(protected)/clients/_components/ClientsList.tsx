'use client';

import React from 'react';
import { IClient } from '@/app/(protected)/clients/types/clients.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ClientsListProps {
  clients: IClient[];
}

export function ClientsList({ clients }: ClientsListProps) {
  if (clients.length === 0) {
    return <p>No clients found.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {clients.map((client) => (
        <Card key={client.id}>
          <CardHeader>
            <CardTitle>{client.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p><strong>Contact Person:</strong> {client.contact_person}</p>
            <p><strong>Email:</strong> {client.email}</p>
            <p><strong>Phone:</strong> {client.phone_number}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
