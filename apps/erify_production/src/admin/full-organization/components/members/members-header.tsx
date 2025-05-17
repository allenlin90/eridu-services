import { InviteMemberForm } from "@/admin/full-organization/components/forms/invite-member-form";
import { Modal } from "@/components/modal";
import { Button } from "@eridu/ui/components/button";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";

export const MembersHeader: React.FC = () => {
  const [openModal, setOpenModal] = useState(false);

  const onOpenModal = useCallback(() => {
    setOpenModal(prev => !prev);
  }, []);

  const onOpenChange = useCallback((open: boolean) => {
    setOpenModal(open);
  }, []);

  return (
    <div className="flex justify-start sm:justify-between items-start sm:items-center flex-col sm:flex-row gap-2">
      <h2 className="text-xl font-semibold">Organization Members</h2>
      <Button className="w-full sm:w-min" onClick={onOpenModal}>
        <Plus className="h-4 w-4 mr-2" />
        <span>Invite Member</span>
      </Button>
      <Modal
        open={openModal}
        onOpenChange={onOpenChange}
        title="Invite a member"
      >
        <InviteMemberForm submit={onOpenModal} />
      </Modal>
    </div>
  );
};

export default MembersHeader;
