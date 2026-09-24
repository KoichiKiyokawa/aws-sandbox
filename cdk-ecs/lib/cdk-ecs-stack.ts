import {
  aws_logs as logs,
  aws_iam as iam,
  aws_ecs as ecs,
  aws_ec2 as ec2,
  aws_applicationautoscaling as alb,
  Stack,
  StackProps,
} from "aws-cdk-lib"
import { Construct } from "constructs"

export interface ServiceStackProps extends StackProps {
  tagOrDigest: string
  cpu: number
  memory: number
}

export class ServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props)

    // IAM Role

    const executionRole = new iam.Role(this, "EcsTaskExecutionRole", {
      roleName: "ecs-task-execution-role",
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        ),
      ],
    })

    const serviceTaskRole = new iam.Role(this, "EcsServiceTaskRole", {
      roleName: "ecs-service-task-role",
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    })

    // ECS TaskDefinition

    const logGroup = new logs.LogGroup(this, "ServiceLogGroup", {
      logGroupName: this.node.tryGetContext("serviceName"),
    })

    const image = ecs.ContainerImage.fromRegistry(
      `${this.node.tryGetContext("repository")}${props.tagOrDigest}`
    )

    const serviceTaskDefinition = new ecs.FargateTaskDefinition(
      this,
      "ServiceTaskDefinition",
      {
        family: this.node.tryGetContext("serviceName"),
        cpu: props.cpu,
        memoryLimitMiB: props.memory,
        executionRole: executionRole,
        taskRole: serviceTaskRole,
      }
    )

    serviceTaskDefinition
      .addContainer("serviceTaskContainerDefinition", {
        image,
        cpu: props.cpu,
        memoryLimitMiB: props.memory,
        memoryReservationMiB: props.memory,
        secrets: {
          SECRET: ecs.Secret.fromSecretsManager(
            secrets.Secret.fromSecretArn(this, "Secrets", "secretのARN")
          ),
          PARAMETER: ecs.Secret.fromSsmParameter(
            ssm.StringParameter.fromStringParameterName(
              this,
              "Parameter",
              "parameterのname"
            )
          ),
        },
        logging: ecs.LogDriver.awsLogs({
          streamPrefix: this.node.tryGetContext("serviceName"),
          logGroup,
        }),
      })
      .addPortMappings({
        containerPort: 3000,
        hostPort: 3000,
        protocol: ecs.Protocol.TCP,
      })

    // ECS Service

    const vpc = ec2.Vpc.fromLookup(this, "vpc", {
      vpcId: tryGetStageContext(this.node, "vpcId"),
    })

    const cluster = ecs.Cluster.fromClusterAttributes(this, "Cluster", {
      clusterName: tryGetStageContext(this.node, "clusterName"),
      vpc: vpc,
      securityGroups: [],
    })

    const securityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      "ApplicationSecurityGroup",
      tryGetStageContext(this.node, "securityGroupId")
    )

    const serviceFargateService = new ecs.FargateService(
      this,
      "ServiceServiceDefinition",
      {
        serviceName: this.node.tryGetContext("serviceName"),
        cluster,
        vpcSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE }),
        securityGroup,
        taskDefinition: serviceTaskDefinition,
        desiredCount: 2,
        maxHealthyPercent: 200,
        minHealthyPercent: 50,
      }
    )

    const albTargetGroup = alb.ApplicationTargetGroup.fromTargetGroupAttributes(
      this,
      "AlbTargetGroup",
      {
        targetGroupArn: tryGetStageContext(this.node, "targetGroupArn"),
      }
    )

    albTargetGroup.addTarget(
      serviceFargateService.loadBalancerTarget({
        containerName: serviceTaskDefinition.defaultContainer!.containerName,
        containerPort: serviceTaskDefinition.defaultContainer!.containerPort,
      })
    )
  }
}
