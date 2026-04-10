import { fetchUsers } from "./data/users.data";
import UsersTable from "./_components/UsersTable";

export const dynamic = "force-dynamic";

type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function UsersPage({ searchParams }: Props) {
    const params = await searchParams;
    const search = typeof params.search === "string" ? params.search : null;
    const limit = typeof params.limit === "string" ? parseInt(params.limit, 10) : 10;
    const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;
    const offset = (page - 1) * limit;

    const result = await fetchUsers(search, limit, offset);

    return (
        <UsersTable
            initialData={result.data ?? { users: [], total: 0 }}
            error={result.error}
        />
    );
}
