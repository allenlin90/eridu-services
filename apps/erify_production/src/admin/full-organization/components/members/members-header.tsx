import { AddMemberForm } from "@/admin/full-organization/components/forms/add-member-form";
import { InviteMemberForm } from "@/admin/full-organization/components/forms/invite-member-form";
import { Modal } from "@/components/modal";
import { Button } from "@eridu/ui/components/button";
import { cn } from "@eridu/ui/lib/utils";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";

const AddMember: React.FC<React.ComponentProps<"button">> = ({ className, ...props }) => {
  const [openModal, setOpenModal] = useState(false);

  const onOpenModal = useCallback(() => {
    setOpenModal(prev => !prev);
  }, []);

  const onOpenChange = useCallback((open: boolean) => {
    setOpenModal(open);
  }, []);

  return (
    <>
      <Button className="w-full sm:w-min" {...props} onClick={onOpenModal}>
        <Plus className={cn("h-4 w-4 mr-2", className)} />
        <span>Add Member</span>
      </Button>
      <Modal
        open={openModal}
        onOpenChange={onOpenChange}
        title="Add a member"
      >
        <AddMemberForm submit={onOpenModal} />
      </Modal>
    </>
  );
};

const InviteMember: React.FC<React.ComponentProps<"button">> = ({ className, ...props }) => {
  const [openModal, setOpenModal] = useState(false);

  const onOpenModal = useCallback(() => {
    setOpenModal(prev => !prev);
  }, []);

  const onOpenChange = useCallback((open: boolean) => {
    setOpenModal(open);
  }, []);

  return (
    <>
      <Button {...props} className="w-full sm:w-min" variant="outline" onClick={onOpenModal}>
        <Plus className={cn("h-4 w-4 mr-2", className)} />
        <span>Invite Member</span>
      </Button>
      <Modal
        open={openModal}
        onOpenChange={onOpenChange}
        title="Invite a member"
      >
        <InviteMemberForm submit={onOpenModal} />
      </Modal>
    </>
  );
};

export const MembersHeader: React.FC = () => {
  return (
    <div className="flex justify-start sm:justify-between items-start sm:items-center flex-col sm:flex-row gap-2">
      <h2 className="text-xl font-semibold text-nowrap">Organization Members</h2>
      <div className="w-full flex gap-2 justify-center sm:justify-end">
        <InviteMember />
        <AddMember />
      </div>
    </div>
  );
};

export default MembersHeader;
