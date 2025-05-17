import { CreateTeamForm } from "@/admin/full-organization/components/forms/create-team-form";
import { Modal } from "@/components/modal";
import { Button } from "@eridu/ui/components/button";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";

export const TeamsHeader: React.FC = () => {
  const [openModal, setOpenModal] = useState(false);

  const onOpenModal = useCallback(() => {
    setOpenModal(prev => !prev);
  }, []);

  const onOpenChange = useCallback((open: boolean) => {
    setOpenModal(open);
  }, []);

  return (
    <div className="flex justify-start sm:justify-between items-start sm:items-center flex-col sm:flex-row gap-2">
      <h2 className="text-xl font-semibold">Organization Teams</h2>
      <Button className="w-full sm:w-min" onClick={onOpenModal}>
        <Plus className="h-4 w-4 mr-2" />
        <span>Create Team</span>
      </Button>
      <Modal
        open={openModal}
        onOpenChange={onOpenChange}
        title="Create a member"
      >
        <CreateTeamForm submit={onOpenModal} />
      </Modal>
    </div>
  );
};

export default TeamsHeader;
