import { ClusterSelected } from "../../generated/templates/ClusterSelector/ClusterSelector";
import { SelectedCluster, Selector } from "../../generated/schema";
import { updatePendingRewardUpdate } from "../utils/helpers";

export function handleClusterSelected(event: ClusterSelected): void {
    updatePendingRewardUpdate(event.transaction.hash);
    let selector = Selector.load(event.address.toHexString());
    if (selector) {
        let id = selector.networkId.toHexString() + "#" + event.params.epoch.toHexString() + "#" + event.params.cluster.toHexString();
        let selectedClusterData = SelectedCluster.load(id);

        if (selectedClusterData == null) {
            selectedClusterData = new SelectedCluster(id);
            selectedClusterData.epoch = event.params.epoch;
            selectedClusterData.address = event.params.cluster.toHexString();
            selectedClusterData.network = selector.networkId.toHexString();
            selectedClusterData.save();
        }
    } else {
        throw new Error("Selector is not saved in the SG");
    }
}
