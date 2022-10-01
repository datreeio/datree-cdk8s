# Datree cdk8s validation plugin

<p align="center">
<img src="https://cdk8s.io/images/logo.svg" width="30%" />
</p>
  
# Overview
[cdk8s](https://cdk8s.io/index.html) by AWS is an open-source software development framework for defining Kubernetes applications using familiar programming languages and rich object-oriented APIs. cdk8s apps synthesize into standard Kubernetes manifests which can then be applied to any Kubernetes cluster.

This plugin allows you to run automatic policy checks against synthesized manifests to ensure that they are configured according to your standards.

## Specification
cdk8s plugins come in the form of NPM packages.  
When specified in the configuration file, the cdk8s CLI will automatically install and run a plugin. See the `Usage` section below for instructions.

## Prerequisites
To use this plugin, the [cdk8s CLI](https://github.com/cdk8s-team/cdk8s-cli#a-command-line-interface-for-cdk-for-kubernetes) needs to be installed.

## Usage
In your cdk8s configuration file, add a `validations` key with the following properties:
- **package** - the name of the npm package to be used
- **class** - the name of the class that implements the interface
- **version** - the version of the package to be used
- **properties** - additional properties to be used. Currently only `policy` is supported, used to set the desired Datree policy to be used for the policy check

To use this plugin, your configuration file should look like this:
```
language: typescript
app: ts-node main.ts
validations:
  - package: @datreeio/datree-cdk8s
    class: DatreeValidation
    version: 1.3.1
    properties:
      policy: cdk8s
```

## Customization
You can use any policy in your [Datree account](https://app.datree.io) for your checks, simply change the value of the `policy` key in your configuration file to the name of your desired policy:
```
properties:
  - policy: default
```
