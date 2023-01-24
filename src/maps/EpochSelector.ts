import { ClusterSelected } from "../../generated/EpochSelector/EpochSelector";
import { SelectedCluster, Selector } from "../../generated/schema";

export function handleClusterSelected(event: ClusterSelected): void {
    let selector = Selector.load(event.address.toHexString());
    if (selector) {
        let id = selector.networkId.toHexString() + "-" + event.params.epoch.toHexString() + "-" + event.params.cluster.toHexString();
        let selectedClusterData = SelectedCluster.load(id);

        if (selectedClusterData == null) {
            selectedClusterData = new SelectedCluster(id);
            selectedClusterData.epoch = event.params.epoch;
            selectedClusterData.address = event.params.cluster.toHexString();
            selectedClusterData.networkId = selector.networkId.toHexString();
            selectedClusterData.save();
        }
    } else {
        throw new Error("Selector is not saved in the SG");
    }
}
