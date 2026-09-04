// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ChainLancerEscrow
 * @notice Non-custodial, programmable escrow contract for cross-border freelance milestones.
 * Built for Polygon Amoy testnet with official Circle USDC.
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract ChainLancerEscrow {
    // Official Polygon Amoy Circle USDC: 0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582
    IERC20 public immutable usdc;
    address public immutable arbitrator;

    enum ContractStatus { DRAFT, FUNDED, COMPLETED, DISPUTED, REFUNDED }
    enum MilestoneStatus { PENDING, SUBMITTED, APPROVED, RELEASED, DISPUTED }

    struct Milestone {
        uint256 amount;
        MilestoneStatus status;
        string evidenceRef;
    }

    struct Agreement {
        bytes32 id;
        address client;
        address freelancer;
        uint256 totalAmount;
        uint256 fundedAmount;
        uint256 releasedAmount;
        ContractStatus status;
        uint8 milestoneCount;
        mapping(uint8 => Milestone) milestones;
    }

    mapping(bytes32 => Agreement) private agreements;
    bytes32[] public agreementIds;

    // Events as required by ChainLancer specification
    event ContractCreated(bytes32 indexed id, address indexed client, address indexed freelancer, uint256 totalAmount);
    event EscrowFunded(bytes32 indexed id, address indexed funder, uint256 amount);
    event MilestoneSubmitted(bytes32 indexed id, uint8 indexed milestoneIndex, string evidenceRef);
    event MilestoneApproved(bytes32 indexed id, uint8 indexed milestoneIndex);
    event DisputeRaised(bytes32 indexed id, uint8 indexed milestoneIndex, address indexed disputer, string reason);
    event MilestoneReleased(bytes32 indexed id, uint8 indexed milestoneIndex, address indexed recipient, uint256 amount);
    event Refunded(bytes32 indexed id, address indexed recipient, uint256 amount);
    event DisputeResolved(bytes32 indexed id, uint8 indexed milestoneIndex, uint256 releasedToFreelancer, uint256 refundedToClient);

    modifier onlyClient(bytes32 id) {
        require(msg.sender == agreements[id].client, "Only client can call");
        _;
    }

    modifier onlyFreelancer(bytes32 id) {
        require(msg.sender == agreements[id].freelancer, "Only freelancer can call");
        _;
    }

    modifier onlyParty(bytes32 id) {
        require(msg.sender == agreements[id].client || msg.sender == agreements[id].freelancer, "Not party to contract");
        _;
    }

    modifier onlyArbitrator() {
        require(msg.sender == arbitrator, "Only arbitrator can call");
        _;
    }

    constructor(address _usdc, address _arbitrator) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_arbitrator != address(0), "Invalid arbitrator address");
        usdc = IERC20(_usdc);
        arbitrator = _arbitrator;
    }

    /**
     * @notice Create a new escrow contract with milestones
     */
    function createContract(
        bytes32 id,
        address freelancer,
        uint256[] calldata milestoneAmounts
    ) external {
        require(agreements[id].client == address(0), "Contract already exists");
        require(freelancer != address(0), "Invalid freelancer address");
        require(milestoneAmounts.length > 0 && milestoneAmounts.length <= 20, "Invalid milestone count");

        Agreement storage a = agreements[id];
        a.id = id;
        a.client = msg.sender;
        a.freelancer = freelancer;
        a.status = ContractStatus.DRAFT;
        a.milestoneCount = uint8(milestoneAmounts.length);

        uint256 total = 0;
        for (uint8 i = 0; i < milestoneAmounts.length; i++) {
            require(milestoneAmounts[i] > 0, "Milestone amount must be > 0");
            a.milestones[i] = Milestone({
                amount: milestoneAmounts[i],
                status: MilestoneStatus.PENDING,
                evidenceRef: ""
            });
            total += milestoneAmounts[i];
        }
        a.totalAmount = total;
        agreementIds.push(id);

        emit ContractCreated(id, msg.sender, freelancer, total);
    }

    /**
     * @notice Fund the escrow agreement with USDC from client wallet
     */
    function fundEscrow(bytes32 id, uint256 amount) external onlyClient(id) {
        Agreement storage a = agreements[id];
        require(a.status == ContractStatus.DRAFT || a.status == ContractStatus.FUNDED, "Cannot fund in current state");
        require(amount > 0, "Amount must be > 0");
        require(a.fundedAmount + amount <= a.totalAmount, "Funding exceeds total amount");

        a.fundedAmount += amount;
        if (a.fundedAmount == a.totalAmount) {
            a.status = ContractStatus.FUNDED;
        }

        bool ok = usdc.transferFrom(msg.sender, address(this), amount);
        require(ok, "USDC transferFrom failed");

        emit EscrowFunded(id, msg.sender, amount);
    }

    /**
     * @notice Submit milestone deliverable evidence (e.g. GitHub PR ref)
     */
    function submitMilestone(bytes32 id, uint8 milestoneIndex, string calldata evidenceRef) external onlyParty(id) {
        Agreement storage a = agreements[id];
        require(a.status == ContractStatus.FUNDED, "Escrow not fully funded");
        require(milestoneIndex < a.milestoneCount, "Invalid milestone index");

        Milestone storage m = a.milestones[milestoneIndex];
        require(m.status == MilestoneStatus.PENDING || m.status == MilestoneStatus.SUBMITTED, "Invalid milestone state");

        m.status = MilestoneStatus.SUBMITTED;
        m.evidenceRef = evidenceRef;

        emit MilestoneSubmitted(id, milestoneIndex, evidenceRef);
    }

    /**
     * @notice Client approves a submitted milestone
     */
    function approveMilestone(bytes32 id, uint8 milestoneIndex) external onlyClient(id) {
        Agreement storage a = agreements[id];
        require(milestoneIndex < a.milestoneCount, "Invalid milestone index");

        Milestone storage m = a.milestones[milestoneIndex];
        require(m.status == MilestoneStatus.SUBMITTED || m.status == MilestoneStatus.PENDING, "Cannot approve");

        m.status = MilestoneStatus.APPROVED;
        emit MilestoneApproved(id, milestoneIndex);
    }

    /**
     * @notice Release approved milestone funds in USDC directly to the freelancer
     */
    function releaseMilestone(bytes32 id, uint8 milestoneIndex) external onlyClient(id) {
        Agreement storage a = agreements[id];
        require(a.status == ContractStatus.FUNDED, "Escrow not funded");
        require(milestoneIndex < a.milestoneCount, "Invalid milestone index");

        Milestone storage m = a.milestones[milestoneIndex];
        require(m.status == MilestoneStatus.APPROVED, "Milestone must be approved first");

        uint256 amount = m.amount;
        require(a.releasedAmount + amount <= a.fundedAmount, "Insufficient escrow balance");

        m.status = MilestoneStatus.RELEASED;
        a.releasedAmount += amount;

        if (a.releasedAmount == a.totalAmount) {
            a.status = ContractStatus.COMPLETED;
        }

        bool ok = usdc.transfer(a.freelancer, amount);
        require(ok, "USDC transfer failed");

        emit MilestoneReleased(id, milestoneIndex, a.freelancer, amount);
    }

    /**
     * @notice Raise dispute on a milestone
     */
    function disputeMilestone(bytes32 id, uint8 milestoneIndex, string calldata reason) external onlyParty(id) {
        Agreement storage a = agreements[id];
        require(milestoneIndex < a.milestoneCount, "Invalid milestone index");

        Milestone storage m = a.milestones[milestoneIndex];
        require(m.status != MilestoneStatus.RELEASED, "Already released");

        m.status = MilestoneStatus.DISPUTED;
        a.status = ContractStatus.DISPUTED;

        emit DisputeRaised(id, milestoneIndex, msg.sender, reason);
    }

    /**
     * @notice Arbitrator resolves dispute with split payouts
     */
    function resolveDispute(
        bytes32 id,
        uint8 milestoneIndex,
        uint256 releaseToFreelancer,
        uint256 refundToClient
    ) external onlyArbitrator {
        Agreement storage a = agreements[id];
        Milestone storage m = a.milestones[milestoneIndex];
        require(m.status == MilestoneStatus.DISPUTED, "Not in dispute");
        require(releaseToFreelancer + refundToClient <= m.amount, "Total exceeds milestone amount");

        m.status = MilestoneStatus.RELEASED;
        a.releasedAmount += (releaseToFreelancer + refundToClient);

        if (releaseToFreelancer > 0) {
            bool ok1 = usdc.transfer(a.freelancer, releaseToFreelancer);
            require(ok1, "Transfer to freelancer failed");
        }
        if (refundToClient > 0) {
            bool ok2 = usdc.transfer(a.client, refundToClient);
            require(ok2, "Refund to client failed");
        }

        a.status = a.releasedAmount == a.totalAmount ? ContractStatus.COMPLETED : ContractStatus.FUNDED;

        emit DisputeResolved(id, milestoneIndex, releaseToFreelancer, refundToClient);
    }

    /**
     * @notice Refund unallocated/unreleased escrow balance back to client
     */
    function refund(bytes32 id, uint256 amount) external onlyClient(id) {
        Agreement storage a = agreements[id];
        uint256 available = a.fundedAmount - a.releasedAmount;
        require(amount > 0 && amount <= available, "Invalid refund amount");

        a.fundedAmount -= amount;
        if (a.fundedAmount == 0) {
            a.status = ContractStatus.REFUNDED;
        }

        bool ok = usdc.transfer(a.client, amount);
        require(ok, "USDC refund failed");

        emit Refunded(id, a.client, amount);
    }

    // View functions
    function getAgreement(bytes32 id) external view returns (
        address client,
        address freelancer,
        uint256 totalAmount,
        uint256 fundedAmount,
        uint256 releasedAmount,
        ContractStatus status,
        uint8 milestoneCount
    ) {
        Agreement storage a = agreements[id];
        return (
            a.client,
            a.freelancer,
            a.totalAmount,
            a.fundedAmount,
            a.releasedAmount,
            a.status,
            a.milestoneCount
        );
    }

    function getMilestone(bytes32 id, uint8 milestoneIndex) external view returns (
        uint256 amount,
        MilestoneStatus status,
        string memory evidenceRef
    ) {
        Agreement storage a = agreements[id];
        Milestone storage m = a.milestones[milestoneIndex];
        return (m.amount, m.status, m.evidenceRef);
    }
}
