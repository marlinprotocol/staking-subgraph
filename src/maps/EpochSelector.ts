import { ClusterSelected } from "../../generated/EpochSelector/EpochSelector";
import { SelectedCluster, Selector } from "../../generated/schema";

export function handleClusterSelected(event: ClusterSelected): void {
    let selector = Selector.load(event.address.toHexString());
    if (selector) {
        let id = selector.networkId.toHexString() + "-" + event.params.epoch.toString() + "-" + event.params.cluster.toString();
        let selectedClusterData = SelectedCluster.load(id);

        if (selectedClusterData == null) {
            selectedClusterData = new SelectedCluster(id);
            selectedClusterData.epoch = event.params.epoch;
            selectedClusterData.address = event.params.cluster.toString();
            selectedClusterData.networkId = selector.networkId;
            selectedClusterData.save();
        }
    } else {
        throw new Error("Selector is not saved in the SG");
    }
}
