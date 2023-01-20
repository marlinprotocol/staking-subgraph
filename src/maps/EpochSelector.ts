import { ClusterSelected } from "../../generated/EpochSelector/EpochSelector";
import { SelectedClusters } from "../../generated/schema";

export function handleClusterSelected(event: ClusterSelected): void {
    let id = event.params.epoch.toString() + "-" + event.params.cluster.toString();
    let selectedClusterData = SelectedClusters.load(id);

    if (selectedClusterData == null) {
        selectedClusterData = new SelectedClusters(id);
        selectedClusterData.epoch = event.params.epoch;
        selectedClusterData.address = event.params.cluster.toString();
        selectedClusterData.save();
    }
}
