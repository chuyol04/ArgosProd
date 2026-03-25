import { CreateInspectionForm } from '../_components/CreateInspectionForm';
import { getClients } from '@/app/(protected)/clients/data/clients.data';
import { IClient } from '@/app/(protected)/clients/types/clients.types';
import PageContainer from "@/components/layout/PageContainer";

export default async function CreateInspectionPage() {
    let clients: IClient[] = [];
    try {
        clients = await getClients();
    } catch (error) {
        console.error("Failed to fetch clients:", error);
    }

    return (
        <PageContainer>
            <div className="flex flex-col gap-4">
                <h1 className="text-3xl font-bold">Generar Inspección</h1>
                <CreateInspectionForm clients={clients} />
            </div>
        </PageContainer>
    );
}