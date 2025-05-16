import { InviteMemberForm } from "@/admin/full-organization/components/forms/invite-member-form";
import { Modal } from "@/components/modal";
import { Button } from "@eridu/ui/components/button";
import { Plus } from "lucide-react";

export const InviteMember: React.FC = () => {
  return (
    <div className="flex justify-start sm:justify-between items-start sm:items-center flex-col sm:flex-row gap-2">
      <h2 className="text-xl font-semibold">Organization Members</h2>
      <Modal
        title="Invite a member"
        trigger={(
          <Button className="w-full sm:w-min">
            <Plus className="h-4 w-4 mr-2" />
            <span>Invite Member</span>
          </Button>
        )}
      >
        <InviteMemberForm />
      </Modal>
    </div>
  );
};

export default InviteMember;
