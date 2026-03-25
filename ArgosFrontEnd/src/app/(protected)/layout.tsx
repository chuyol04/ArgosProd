import UserDataProvider from "./_components/UserDataProvider";
import ProtectedLayoutWrapper from "./_components/ProtectedLayoutWrapper";

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <UserDataProvider>
            <ProtectedLayoutWrapper>
                {children}
            </ProtectedLayoutWrapper>
        </UserDataProvider>
    );
}
